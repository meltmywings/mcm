/**
 * Responsive site navigation following modern-web-guidance `navbar`:
 * - Uses one <nav> landmark across narrow (popover) and wide (inline) modes
 * - Measures natural row width via scrollWidth <= clientWidth
 * - Uses setAttribute/removeAttribute('popover', 'auto') rather than IDL property
 */

export interface NavbarController {
  measure: () => void;
  destroy: () => void;
}

export async function ensurePopoverPolyfill(): Promise<void> {
  if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
    await import('@oddbird/popover-polyfill');
  }
}

export function initNavbar(header: HTMLElement | null): NavbarController | null {
  if (!header) return null;

  const inner = header.querySelector<HTMLElement>('.header-inner');
  const menu = header.querySelector<HTMLElement>('#site-menu');
  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>('.site-menu a'));

  if (!inner || !menu) return null;

  let lastHeaderWidth = header.getBoundingClientRect().width;
  let rafId = 0;

  const measure = () => {
    const isCurrentlyWide = header.classList.contains('is-wide');
    const wasOpen =
      !isCurrentlyWide &&
      menu.hasAttribute('popover') &&
      typeof menu.matches === 'function' &&
      (menu.matches(':popover-open') || menu.classList.contains(':popover-open'));

    header.classList.add('is-measuring', 'is-wide');
    const fitsInline = inner.scrollWidth <= inner.clientWidth;

    header.classList.toggle('is-wide', fitsInline);

    if (fitsInline) {
      menu.removeAttribute('popover');
    } else {
      menu.setAttribute('popover', 'auto');
      if (wasOpen && typeof menu.showPopover === 'function') {
        try {
          menu.showPopover();
        } catch {
          // Ignore if top-layer state cannot be restored in synthetic environments
        }
      }
    }

    if (rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }

    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(() => {
        header.classList.remove('is-measuring');
      });
    } else {
      header.classList.remove('is-measuring');
    }
  };

  const handleLinkClick = (event: Event) => {
    const target = event.currentTarget as HTMLAnchorElement;
    links.forEach((link) => link.removeAttribute('aria-current'));
    target.setAttribute('aria-current', 'page');

    if (!header.classList.contains('is-wide') && typeof menu.hidePopover === 'function') {
      try {
        menu.hidePopover();
      } catch {
        // Ignore if already closed
      }
    }
  };

  links.forEach((link) => link.addEventListener('click', handleLinkClick));

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver((entries) => {
      const nextWidth = header.getBoundingClientRect().width;
      const isWide = header.classList.contains('is-wide');
      const headerEntry = entries.find((entry) => entry.target === header);

      if (isWide || !headerEntry || nextWidth > lastHeaderWidth) {
        lastHeaderWidth = nextWidth;
        measure();
      } else {
        lastHeaderWidth = nextWidth;
      }
    });
    observer.observe(header);
    observer.observe(menu);
  }

  measure();

  return {
    measure,
    destroy: () => {
      observer?.disconnect();
      if (rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      links.forEach((link) => link.removeEventListener('click', handleLinkClick));
    },
  };
}

