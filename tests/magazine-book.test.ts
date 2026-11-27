import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderCustomSections,
  renderPagePhotos,
  renderPageTextBlocks,
} from '../src/scripts/cmsView';
import { initMagazineBook } from '../src/scripts/magazineBook';

function loadIndexDom(): void {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/i);
  document.body.innerHTML = bodyMatch ? bodyMatch[1] : html;
}

describe('Online Magazine Book, Page Flipping, Logo Cover Return & Glossary', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, 'startViewTransition');
    document.body.innerHTML = '';
  });

  it('starts on the Cover Page, flips forward and backward, and returns to Cover via top-left logo', () => {
    loadIndexDom();
    const ctrl = initMagazineBook(document)!;
    expect(ctrl).not.toBeNull();

    const pages = ctrl.getPages();
    expect(pages.length).toBe(14);
    expect(pages[1].id).toBe('glossary-1');
    expect(pages[2].id).toBe('glossary-2');
    expect(ctrl.getCurrentIndex()).toBe(0);
    expect(pages[0].element.hidden).toBe(false);
    expect(pages[1].element.hidden).toBe(true);

    const nextBtn = document.getElementById('mag-next-btn') as HTMLButtonElement;
    const prevBtn = document.getElementById('mag-prev-btn') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    nextBtn.click();
    expect(ctrl.getCurrentIndex()).toBe(1);
    expect(pages[0].element.hidden).toBe(true);
    expect(pages[1].element.hidden).toBe(false);
    expect(prevBtn.disabled).toBe(false);

    nextBtn.click();
    expect(ctrl.getCurrentIndex()).toBe(2);
    expect(document.getElementById('mag-page-status')?.textContent).toContain('PAGE 02');

    // Top-left website logo returns to Cover Page, Cover shows MC logo artwork, and interior chapters integrate torn images into text flow
    expect(document.querySelector('.site-header #site-menu')).toBeNull();
    expect(document.querySelector('.site-header .menu-button')).toBeNull();
    expect(document.querySelector<HTMLImageElement>('#cover .hero-mc-logo')?.getAttribute('src')).toBe('/mc-logo.svg');
    expect(document.querySelector('#metrics .mag-ref-sheet .mag-ref-left-stage .mag-ref-photos')).not.toBeNull();
    const topLogo = document.querySelector<HTMLAnchorElement>('.site-header .site-logo')!;
    topLogo.click();
    expect(ctrl.getCurrentIndex()).toBe(0);
    expect(pages[0].element.hidden).toBe(false);
    expect(pages[2].element.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('.mag-pager')?.hidden).toBe(false);

    ctrl.destroy();
  });

  it('opens the Magazine Glossary from the Cover Page with all pages and descriptions, and jumps to clicked page', () => {
    loadIndexDom();
    const dialog = document.getElementById('glossary-dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });

    const ctrl = initMagazineBook(document)!;
    const coverGlossaryBtn = document.getElementById('open-glossary-btn') as HTMLButtonElement;
    coverGlossaryBtn.click();

    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    const chapters = document.querySelectorAll<HTMLElement>('#glossary-list .glossary-chapter-heading');
    expect(chapters.length).toBeGreaterThanOrEqual(5);
    const entries = document.querySelectorAll<HTMLButtonElement>('#glossary-list .glossary-entry-btn');
    expect(entries).toHaveLength(14);
    expect(entries[0].textContent).toContain('COVER');
    expect(entries[0].textContent).toContain('Cover & Masthead');
    expect(entries[4].textContent).toContain('PAGE 04');
    expect(entries[4].textContent).toContain('Campaigns that hijacked the feed.');
    expect(entries[4].textContent).toContain('Filter by channel discipline');

    // Glossary Pt. I & Pt. II in-book spread also renders chapter headings & jump buttons
    expect(document.querySelectorAll('#glossary-spread-left .glossary-chapter-heading').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('#glossary-spread-right .glossary-chapter-heading').length).toBeGreaterThanOrEqual(2);

    entries[7].click();
    expect(dialog.close).toHaveBeenCalledTimes(1);
    expect(ctrl.getCurrentIndex()).toBe(7);
    expect(ctrl.getPages()[7].id).toBe('services');

    ctrl.destroy();
  });

  it('uses element-scoped startViewTransition on #mag-book so bottom pager stays visible', () => {
    loadIndexDom();
    const book = document.getElementById('mag-book') as HTMLElement & {
      startViewTransition?: (opts: { update: () => void; types?: string[] }) => {
        ready?: Promise<void>;
        finished?: Promise<void>;
      };
    };
    const scopedTransition = vi.fn((opts: { update: () => void; types?: string[] }) => {
      opts.update();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });
    book.startViewTransition = scopedTransition;

    const docTransition = vi.fn();
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: docTransition,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false }),
    );

    renderCustomSections(document.getElementById('custom-sections-root'), [
      {
        id: 'tiktok-drop',
        eyebrow: 'TikTok Edit',
        heading: 'Viral Soundwaves',
        subtitle: 'Creator clips from Q4.',
        elements: [{ id: 't1', type: 'text', title: 'Highlight', body: 'Featured creator reels.' }],
      },
    ]);

    const ctrl = initMagazineBook(document)!;
    expect(ctrl.getPages()).toHaveLength(15);

    ctrl.goToPage(3);
    expect(scopedTransition).toHaveBeenLastCalledWith(
      expect.objectContaining({ types: ['forward'] }),
    );
    expect(docTransition).not.toHaveBeenCalled();

    ctrl.goToPage(1);
    expect(scopedTransition).toHaveBeenLastCalledWith(
      expect.objectContaining({ types: ['backward'] }),
    );

    // Text-only Glossary spread has zero images, while illustrated spreads render cutout silhouettes
    expect(document.querySelectorAll('#glossary-1 img, #glossary-2 img')).toHaveLength(0);

    const editorialImgs = document.querySelectorAll<HTMLImageElement>('.mag-page .mag-photo-img');
    expect(editorialImgs.length).toBeGreaterThanOrEqual(45);
    editorialImgs.forEach((img) => {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('src')).toMatch(/^\/magazines\/(?:cutouts\/)?mag-\d{2}\.(?:jpg|png)$/);
    });

    // Interior illustrated page cutouts expose contextual PNG silhouettes and shape-outside wrapping
    const interiorFigs = document.querySelectorAll<HTMLElement>(
      '.is-zine-page .mag-ref-photos .mag-photo-figure',
    );
    expect(interiorFigs.length).toBeGreaterThanOrEqual(44);
    interiorFigs.forEach((fig) => {
      const img = fig.querySelector<HTMLImageElement>('.mag-photo-img');
      expect(img?.getAttribute('src')).toMatch(/^\/magazines\/cutouts\/mag-\d{2}\.png$/);
      expect(fig.style.shapeOutside).toMatch(/^polygon\(/);
    });

    ctrl.destroy();
  });

  it('tracks horizontal swipe gestures with live finger-tracking page curl and turns pages left/right', () => {
    loadIndexDom();
    const book = document.getElementById('mag-book')!;
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 400, height: 700, top: 0, left: 0, right: 400, bottom: 700 }),
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false }),
    );

    const ctrl = initMagazineBook(document)!;
    expect(ctrl.getCurrentIndex()).toBe(0);

    const dispatchPointer = (type: string, clientX: number, clientY = 200) => {
      const evt = new Event(type, { bubbles: true, cancelable: true }) as unknown as PointerEvent;
      Object.defineProperty(evt, 'pointerId', { value: 1 });
      Object.defineProperty(evt, 'isPrimary', { value: true });
      Object.defineProperty(evt, 'button', { value: 0 });
      Object.defineProperty(evt, 'clientX', { value: clientX });
      Object.defineProperty(evt, 'clientY', { value: clientY });
      book.dispatchEvent(evt);
    };

    // Swipe left (forward) from 320 -> 120 (-200px out of 280px curl threshold => Google Books corner clipPath peel)
    dispatchPointer('pointerdown', 320, 520);
    dispatchPointer('pointermove', 120, 480);

    expect(book.classList.contains('is-curling')).toBe(true);
    expect(book.classList.contains('is-curling-forward')).toBe(true);
    expect(Number(book.style.getPropertyValue('--curl-p'))).toBeGreaterThan(0.5);
    expect(ctrl.getPages()[0].element.classList.contains('is-curl-top')).toBe(true);
    expect(ctrl.getPages()[0].element.style.clipPath).toContain('polygon(');
    expect(document.getElementById('mag-curl-flap')?.style.clipPath).toContain('polygon(');
    expect(ctrl.getPages()[1].element.classList.contains('is-curl-underneath')).toBe(true);

    // Release completes turn onto Page 01
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    dispatchPointer('pointerup', 120, 480);
    expect(ctrl.getCurrentIndex()).toBe(1);
    expect(book.classList.contains('is-curling')).toBe(false);

    // Swipe right (backward) from 80 -> 260 (+180px => returns to Cover Page)
    dispatchPointer('pointerdown', 80, 520);
    dispatchPointer('pointermove', 260, 480);
    expect(book.classList.contains('is-curling-backward')).toBe(true);
    expect(ctrl.getPages()[0].element.classList.contains('is-curl-top')).toBe(true);
    expect(ctrl.getPages()[1].element.classList.contains('is-curl-underneath')).toBe(true);
    dispatchPointer('pointerup', 260, 480);
    expect(ctrl.getCurrentIndex()).toBe(0);

    // Swipe starting on a coverline link also turns page and suppresses click activation
    const coverLink = document.querySelector<HTMLAnchorElement>('.mag-coverline-link')!;
    const dispatchOn = (target: EventTarget, type: string, clientX: number, clientY = 200) => {
      const evt = new Event(type, { bubbles: true, cancelable: true }) as unknown as PointerEvent;
      Object.defineProperty(evt, 'pointerId', { value: 2 });
      Object.defineProperty(evt, 'isPrimary', { value: true });
      Object.defineProperty(evt, 'button', { value: 0 });
      Object.defineProperty(evt, 'clientX', { value: clientX });
      Object.defineProperty(evt, 'clientY', { value: clientY });
      target.dispatchEvent(evt);
    };
    dispatchOn(coverLink, 'pointerdown', 300, 400);
    dispatchOn(book, 'pointermove', 120, 400);
    dispatchOn(book, 'pointerup', 120, 400);
    expect(ctrl.getCurrentIndex()).toBe(1);

    // Rapid consecutive swipes while settle animation RAF is still pending advance through pages without getting stuck
    let rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    dispatchPointer('pointerdown', 320, 420);
    dispatchPointer('pointermove', 140, 420);
    dispatchPointer('pointerup', 140, 420); // settle pending for page 1 -> 2

    dispatchPointer('pointerdown', 320, 420); // must flush 1 -> 2 before starting 2 -> 3!
    dispatchPointer('pointermove', 140, 420);
    dispatchPointer('pointerup', 140, 420); // settle pending for page 2 -> 3

    dispatchPointer('pointerdown', 320, 420); // must flush 2 -> 3 before starting 3 -> 4!
    dispatchPointer('pointermove', 140, 420);
    dispatchPointer('pointerup', 140, 420);

    // Also fast flick without intermediate pointermove commits cleanly
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    dispatchPointer('pointerdown', 320, 420);
    dispatchPointer('pointerup', 220, 420);
    expect(ctrl.getCurrentIndex()).toBe(5);

    ctrl.destroy();
  });

  it('uses single-page cover and two-page Glossary opening spread with swipe support on wider displays', () => {
    loadIndexDom();
    const book = document.getElementById('mag-book')!;
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 1000, height: 760, top: 0, left: 0, right: 1000, bottom: 760 }),
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('56rem'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);

    const ctrl = initMagazineBook(document)!;
    const pages = ctrl.getPages();

    // Cover is a single page centered even on wide displays (using right-sheet 50% width so size stays constant)
    expect(book.classList.contains('is-double-spread')).toBe(true);
    expect(book.classList.contains('is-cover-spread-active')).toBe(true);
    expect(pages[0].element.hidden).toBe(false);
    expect(pages[0].element.classList.contains('is-right-sheet')).toBe(true);
    expect(pages[1].element.hidden).toBe(true);

    // Mid-swipe opening Cover -> pre-renders Glossary 01 (verso flipping to Left) & Glossary 02 (underneath Right)
    const dispatchPointer = (type: string, clientX: number, clientY = 300) => {
      const evt = new Event(type, { bubbles: true, cancelable: true }) as unknown as PointerEvent;
      Object.defineProperty(evt, 'pointerId', { value: 9 });
      Object.defineProperty(evt, 'isPrimary', { value: true });
      Object.defineProperty(evt, 'button', { value: 0 });
      Object.defineProperty(evt, 'clientX', { value: clientX });
      Object.defineProperty(evt, 'clientY', { value: clientY });
      book.dispatchEvent(evt);
    };

    dispatchPointer('pointerdown', 800, 320);
    dispatchPointer('pointermove', 520, 320); // ~62% past spine midpoint: verso Glossary 01 swings left, Glossary 02 visible underneath right
    expect(pages[0].element.classList.contains('is-flip-leaf-right')).toBe(true);
    expect(pages[0].element.classList.contains('is-right-sheet')).toBe(false);
    expect(pages[1].element.hidden).toBe(false);
    expect(pages[1].element.classList.contains('is-flip-leaf-left')).toBe(true);
    expect(pages[1].element.style.transform).toContain('rotateY(');
    expect(pages[2].element.hidden).toBe(false);
    expect(pages[2].element.classList.contains('is-static-right')).toBe(true);

    dispatchPointer('pointerup', 350, 320);

    expect(ctrl.getCurrentIndex()).toBe(1);
    expect(book.classList.contains('is-cover-spread-active')).toBe(false);
    expect(pages[0].element.hidden).toBe(true);
    expect(pages[1].element.hidden).toBe(false);
    expect(pages[2].element.hidden).toBe(false);
    expect(pages[1].element.classList.contains('is-left-sheet')).toBe(true);
    expect(pages[2].element.classList.contains('is-right-sheet')).toBe(true);

    // Mid-swipe from Glossary [01 | 02] -> [03 | 04]: right page flips to become Left page (03), while 04 pre-renders underneath on Right
    dispatchPointer('pointerdown', 800, 320);
    dispatchPointer('pointermove', 620, 320);
    expect(pages[1].element.classList.contains('is-static-left')).toBe(true);
    expect(pages[2].element.classList.contains('is-flip-leaf-right')).toBe(true);
    expect(pages[3].element.hidden).toBe(false);
    expect(pages[3].element.classList.contains('is-flip-leaf-left')).toBe(true);
    expect(pages[4].element.hidden).toBe(false);
    expect(pages[4].element.classList.contains('is-static-right')).toBe(true);
    dispatchPointer('pointerup', 350, 320);
    expect(ctrl.getCurrentIndex()).toBe(3);
    expect(pages[3].element.hidden).toBe(false);
    expect(pages[4].element.hidden).toBe(false);

    // Swipe backward twice -> Glossary spread -> Single Cover
    dispatchPointer('pointerdown', 200, 320);
    dispatchPointer('pointermove', 350, 320); // first half of left-to-right turn
    expect(pages[3].element.classList.contains('is-flip-leaf-left')).toBe(true);
    expect(pages[3].element.classList.contains('is-left-sheet')).toBe(false);
    expect(pages[4].element.classList.contains('is-static-right')).toBe(true);
    expect(pages[4].element.classList.contains('is-right-sheet')).toBe(false);
    dispatchPointer('pointerup', 650, 320);
    expect(ctrl.getCurrentIndex()).toBe(1);

    dispatchPointer('pointerdown', 200, 320);
    dispatchPointer('pointermove', 650, 320);
    dispatchPointer('pointerup', 650, 320);
    expect(ctrl.getCurrentIndex()).toBe(0);
    expect(book.classList.contains('is-cover-spread-active')).toBe(true);

    // Clicking vs swiping over a Glossary link: tap navigates to target page, horizontal drag turns spread instead of activating link
    ctrl.nextPage();
    expect(ctrl.getCurrentIndex()).toBe(1);
    const spreadEntry = document.querySelector<HTMLButtonElement>(
      '#glossary-spread-right .glossary-entry-btn[data-glossary-index="7"]',
    )!;
    expect(spreadEntry).not.toBeNull();

    // Tap (no drag) jumps to page 7
    spreadEntry.click();
    expect(ctrl.getCurrentIndex()).toBe(7);

    // Return to Glossary spread and verify horizontal drag starting on Glossary button suppresses click and flips spread cleanly
    ctrl.goToPage(1);
    const liveEntry = document.querySelector<HTMLButtonElement>(
      '#glossary-spread-right .glossary-entry-btn[data-glossary-index="7"]',
    )!;
    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 42;
    });
    const dragTarget = (type: string, target: EventTarget, clientX: number) => {
      const evt = new Event(type, { bubbles: true, cancelable: true }) as unknown as PointerEvent;
      Object.defineProperty(evt, 'pointerId', { value: 11 });
      Object.defineProperty(evt, 'isPrimary', { value: true });
      Object.defineProperty(evt, 'button', { value: 0 });
      Object.defineProperty(evt, 'clientX', { value: clientX });
      Object.defineProperty(evt, 'clientY', { value: 320 });
      target.dispatchEvent(evt);
    };

    dragTarget('pointerdown', liveEntry, 780);
    dragTarget('pointermove', book, 420);
    dragTarget('pointerup', book, 420);
    const postDragClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    liveEntry.dispatchEvent(postDragClick);
    expect(postDragClick.defaultPrevented).toBe(true);
    // Complete settle animation -> settles on spread [03 | 04], never jumped to 7
    (rafCb as FrameRequestCallback | null)?.(10000);
    expect(ctrl.getCurrentIndex()).toBe(3);

    ctrl.destroy();
  });

  it('dynamically measures header/pager safe bounds and reshuffles overflowing pages to eliminate vertical scrolling', () => {
    loadIndexDom();
    const header = document.querySelector<HTMLElement>('.site-header')!;
    const pager = document.querySelector<HTMLElement>('.mag-pager')!;
    Object.defineProperty(header, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 54, top: 0, left: 0, right: 390, bottom: 54 }),
    });
    Object.defineProperty(pager, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 74, top: 726, left: 0, right: 390, bottom: 800 }),
    });

    const pageOne = document.getElementById('metrics')!;
    Object.defineProperty(pageOne, 'clientWidth', { configurable: true, get: () => 380 });
    Object.defineProperty(pageOne, 'clientHeight', { configurable: true, get: () => 600 });
    Object.defineProperty(pageOne, 'scrollHeight', {
      configurable: true,
      get: () => (pageOne.dataset.fitTier === '2' || pageOne.dataset.fitTier === '3' ? 580 : 740),
    });

    const ctrl = initMagazineBook(document)!;
    ctrl.goToPage(3); // Metrics page (overflows at default tier & tier 1, fits after tier 2 reshuffle)

    expect(document.documentElement.style.getPropertyValue('--mag-header-actual')).toBe('54px');
    expect(document.documentElement.style.getPropertyValue('--mag-pager-actual')).toBe('74px');
    expect(pageOne.dataset.fitTier).toBe('2');

    ctrl.destroy();
  });

  it('updates magazine page photos and extra editorial text blocks dynamically from CMS data', () => {
    loadIndexDom();
    renderPagePhotos(document, {
      work: [
        { id: 'p1', src: '/magazines/mag-08.jpg', caption: 'Editorial Autumn Shoot' },
      ],
      events: [],
    });

    const workImgs = document.querySelectorAll<HTMLImageElement>('#work [data-page-photos="work"] .mag-photo-img');
    expect(workImgs).toHaveLength(1);
    expect(workImgs[0].getAttribute('src')).toBe('/magazines/mag-08.jpg');
    expect(document.querySelector('#events')?.classList.contains('no-photos')).toBe(true);

    renderPageTextBlocks(document, {
      metrics: [
        { id: 'tb1', style: 'article', title: 'Editor Note', body: 'New quarterly circulation numbers.' },
        { id: 'tb2', style: 'pullquote', title: 'Editorial Desk', body: 'Culture moves at the speed of taste.' },
      ],
    });
    const extraTexts = document.querySelector('[data-page-texts="metrics"]')!;
    expect(extraTexts.textContent).toContain('Editor Note');
    expect(extraTexts.textContent).toContain('New quarterly circulation numbers.');
    expect(extraTexts.querySelector('.quote-text')?.textContent).toBe('Culture moves at the speed of taste.');
  });
});
