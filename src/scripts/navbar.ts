/**
 * Responsive site navigation:
 * - One <nav> landmark across narrow (popover/overlay) and wide (inline) modes
 * - Measures natural row width via scrollWidth <= clientWidth
 * - Explicit click/Escape/outside-click handling so Menu always opens reliably on iOS & desktop
 */

export interface NavbarController {
  measure: () => void;
  destroy: () => void;
}

export async function ensurePopoverPolyfill(): Promise<void> {
  if (
    typeof HTMLElement !== 'undefined' &&
    typeof CSS !== 'undefined' &&
    typeof CSS.escape === 'function' &&
    !Object.hasOwn(HTMLElement.prototype, 'popover')
  ) {
    await import('@oddbird/popover-polyfill');
  }
}

export function initNavbar(header: HTMLElement | null): NavbarController | null {
  if (!header) return null;

  const inner = header.querySelector<HTMLElement>('.header-inner');
  const menuButton = header.querySelector<HTMLButtonElement>('.menu-button');
  const menu = header.querySelector<HTMLElement>('#site-menu');
  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>('.site-menu a'));

  if (!inner || !menu) return null;

  let lastHeaderWidth = header.getBoundingClientRect().width;
  let rafId = 0;

  const isMenuOpen = () => {
    if (menu.classList.contains('is-open')) return true;
    try {
      return typeof menu.matches === 'function' && menu.matches(':popover-open');
    } catch {
      return false;
    }
  };

  const openMenu = () => {
    if (header.classList.contains('is-wide')) return;
    menu.classList.add('is-open');
    menuButton?.setAttribute('aria-expanded', 'true');
    if (typeof menu.showPopover === 'function') {
      try {
        if (!menu.matches(':popover-open')) menu.showPopover();
      } catch {
        // Fallback .is-open class remains active
      }
    }
  };

  const closeMenu = () => {
    menu.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (typeof menu.hidePopover === 'function') {
      try {
        if (menu.matches(':popover-open')) menu.hidePopover();
      } catch {
        // Ignore if already closed
      }
    }
  };

  const measure = () => {
    const isCurrentlyWide = header.classList.contains('is-wide');
    const wasOpen = !isCurrentlyWide && isMenuOpen();

    header.classList.add('is-measuring', 'is-wide');
    const fitsInline = inner.scrollWidth <= inner.clientWidth;

    header.classList.toggle('is-wide', fitsInline);

    if (fitsInline) {
      menu.classList.remove('is-open');
      menu.removeAttribute('popover');
      menuButton?.setAttribute('aria-expanded', 'false');
    } else {
      if (menu.getAttribute('popover') !== 'auto') {
        menu.setAttribute('popover', 'auto');
      }
      if (wasOpen) {
        openMenu();
      } else {
        menuButton?.setAttribute('aria-expanded', 'false');
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

  const handleMenuButtonClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isMenuOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleLinkClick = (event: Event) => {
    const target = event.currentTarget as HTMLAnchorElement;
    links.forEach((link) => link.removeAttribute('aria-current'));
    target.setAttribute('aria-current', 'page');

    if (!header.classList.contains('is-wide')) {
      closeMenu();
    }
  };

  const handleDocumentClick = (event: Event) => {
    if (header.classList.contains('is-wide') || !isMenuOpen()) return;
    const target = event.target as Node | null;
    if (target && !menu.contains(target) && !menuButton?.contains(target)) {
      closeMenu();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !header.classList.contains('is-wide') && isMenuOpen()) {
      closeMenu();
      menuButton?.focus();
    }
  };

  const handlePopoverToggle = (event: Event) => {
    const toggleEvent = event as Event & { newState?: string };
    if (toggleEvent.newState === 'closed') {
      menu.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
    } else if (toggleEvent.newState === 'open') {
      menu.classList.add('is-open');
      menuButton?.setAttribute('aria-expanded', 'true');
    }
  };

  menuButton?.addEventListener('click', handleMenuButtonClick);
  links.forEach((link) => link.addEventListener('click', handleLinkClick));
  menu.addEventListener('toggle', handlePopoverToggle);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeyDown);

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      const nextWidth = header.getBoundingClientRect().width;
      const isWide = header.classList.contains('is-wide');

      if (isWide || nextWidth > lastHeaderWidth) {
        lastHeaderWidth = nextWidth;
        measure();
      } else {
        lastHeaderWidth = nextWidth;
      }
    });
    observer.observe(header);
  }

  measure();

  return {
    measure,
    destroy: () => {
      observer?.disconnect();
      if (rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      menuButton?.removeEventListener('click', handleMenuButtonClick);
      links.forEach((link) => link.removeEventListener('click', handleLinkClick));
      menu.removeEventListener('toggle', handlePopoverToggle);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    },
  };
}
