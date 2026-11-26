interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithInstall = Navigator & {
  install?: () => Promise<void>;
};

export interface InstallController {
  destroy: () => void;
}

export function registerAppServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal in environments without service worker support
    });
  };
  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    register();
  } else if (typeof window !== 'undefined') {
    window.addEventListener('load', register, { once: true });
  }
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const installedDisplay =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches);
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return installedDisplay || iosStandalone;
}

export function initInstallPrompt(
  root: ParentNode = document,
  options: { buttonSelector?: string; statusSelector?: string } = {},
): InstallController | null {
  const button = root.querySelector<HTMLButtonElement>(
    options.buttonSelector ?? '#install-app-btn',
  );
  const statusEl = root.querySelector<HTMLElement>(options.statusSelector ?? '#install-status');

  if (!button || typeof window === 'undefined') return null;

  const supportsWebInstall =
    typeof Navigator !== 'undefined' &&
    typeof (Navigator.prototype as NavigatorWithInstall).install === 'function';

  let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;

  const setStatus = (message: string) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = message.length === 0;
  };

  if (supportsWebInstall && !isStandaloneApp()) {
    button.hidden = false;
  }

  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;

    if (!supportsWebInstall && !isStandaloneApp()) {
      button.hidden = false;
    }
  };

  const onAppInstalled = () => {
    deferredInstallPrompt = undefined;
    button.hidden = true;
    setStatus('App installed.');
  };

  const onButtonClick = async () => {
    if (button.getAttribute('aria-disabled') === 'true') {
      return;
    }
    // Use aria-disabled instead of disabled so activating the button does not drop focus.
    button.setAttribute('aria-disabled', 'true');

    try {
      const nav = navigator as NavigatorWithInstall;
      if (supportsWebInstall && typeof nav.install === 'function') {
        // Call directly from this click handler to retain transient user activation.
        await nav.install();
        setStatus('The app was installed or opened.');
        button.hidden = true;
      } else if (deferredInstallPrompt) {
        // Save and clear the single-use event before awaiting the user's choice.
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = undefined;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;

        setStatus(
          outcome === 'accepted' ? 'The app was installed.' : 'Installation canceled.',
        );
        if (!deferredInstallPrompt) {
          button.hidden = true;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStatus('Installation was canceled or could not complete.');
      } else {
        setStatus('Installation could not start.');
      }
    } finally {
      button.removeAttribute('aria-disabled');
    }
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  button.addEventListener('click', onButtonClick);

  return {
    destroy: () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      button.removeEventListener('click', onButtonClick);
    },
  };
}
