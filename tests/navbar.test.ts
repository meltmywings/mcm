import { afterEach, describe, expect, it, vi } from 'vitest';
import { initNavbar } from '../src/scripts/navbar';

function buildHeaderDom(): HTMLElement {
  document.body.innerHTML = `
    <header class="site-header" id="site-header">
      <div class="header-inner">
        <a class="site-logo" href="#top" aria-current="page">MAIN CHARACTER MEDIA</a>
        <nav class="site-nav" aria-label="Primary">
          <button class="menu-button" type="button" aria-controls="site-menu" aria-expanded="false">
            <span>Menu</span>
          </button>
          <ul id="site-menu" class="site-menu" popover="auto">
            <li><a href="#work">Work</a></li>
            <li><a href="#services">Services</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `;
  return document.getElementById('site-header')!;
}

describe('Navbar controller', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('switches to inline mode and removes popover attribute when header row fits', () => {
    const header = buildHeaderDom();
    const inner = header.querySelector('.header-inner') as HTMLElement;
    const menu = header.querySelector('#site-menu') as HTMLElement;

    Object.defineProperty(inner, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(inner, 'clientWidth', { configurable: true, value: 800 });

    const ctrl = initNavbar(header);
    expect(header.classList.contains('is-wide')).toBe(true);
    expect(menu.hasAttribute('popover')).toBe(false);
    ctrl?.destroy();
  });

  it('switches to collapsed popover mode when header row overflows', () => {
    const header = buildHeaderDom();
    const inner = header.querySelector('.header-inner') as HTMLElement;
    const menu = header.querySelector('#site-menu') as HTMLElement;

    let scrollW = 600;
    let clientW = 800;
    Object.defineProperty(inner, 'scrollWidth', { configurable: true, get: () => scrollW });
    Object.defineProperty(inner, 'clientWidth', { configurable: true, get: () => clientW });

    const ctrl = initNavbar(header);
    expect(header.classList.contains('is-wide')).toBe(true);

    scrollW = 900;
    clientW = 480;
    ctrl?.measure();

    expect(header.classList.contains('is-wide')).toBe(false);
    expect(menu.getAttribute('popover')).toBe('auto');
    ctrl?.destroy();
  });

  it('updates aria-current="page" when clicking a navigation link', () => {
    const header = buildHeaderDom();
    const inner = header.querySelector('.header-inner') as HTMLElement;
    Object.defineProperty(inner, 'scrollWidth', { configurable: true, value: 500 });
    Object.defineProperty(inner, 'clientWidth', { configurable: true, value: 900 });

    const ctrl = initNavbar(header);
    const links = header.querySelectorAll('.site-menu a');
    (links[1] as HTMLAnchorElement).click();

    expect(links[0].hasAttribute('aria-current')).toBe(false);
    expect(links[1].getAttribute('aria-current')).toBe('page');
    ctrl?.destroy();
  });

  it('toggles menu open/closed via the Menu button in collapsed mode and closes on Escape or link click', () => {
    const header = buildHeaderDom();
    const inner = header.querySelector('.header-inner') as HTMLElement;
    const menu = header.querySelector('#site-menu') as HTMLElement;
    const menuBtn = header.querySelector('.menu-button') as HTMLButtonElement;
    const link = header.querySelector('.site-menu a') as HTMLAnchorElement;

    Object.defineProperty(inner, 'scrollWidth', { configurable: true, value: 900 });
    Object.defineProperty(inner, 'clientWidth', { configurable: true, value: 390 });

    const ctrl = initNavbar(header);
    expect(header.classList.contains('is-wide')).toBe(false);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');
    expect(menu.classList.contains('is-open')).toBe(false);

    menuBtn.click();
    expect(menu.classList.contains('is-open')).toBe(true);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('true');

    menuBtn.click();
    expect(menu.classList.contains('is-open')).toBe(false);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

    menuBtn.click();
    expect(menu.classList.contains('is-open')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.classList.contains('is-open')).toBe(false);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

    menuBtn.click();
    expect(menu.classList.contains('is-open')).toBe(true);
    link.click();
    expect(menu.classList.contains('is-open')).toBe(false);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

    ctrl?.destroy();
  });
});

