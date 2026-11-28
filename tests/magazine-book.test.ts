import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderCustomSections,
  renderPagePhotos,
  renderPageTextBlocks,
} from '../src/scripts/cmsView';
import { bootstrapApp } from '../src/main';
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
    vi.unstubAllGlobals();
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

    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    const ctrl = initMagazineBook(document)!;
    const coverGlossaryBtn = document.getElementById('open-glossary-btn') as HTMLButtonElement;
    coverGlossaryBtn.click();

    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    const chapters = document.querySelectorAll<HTMLElement>('#glossary-list .glossary-chapter-heading');
    expect(chapters.length).toBeGreaterThanOrEqual(7);
    const entries = Array.from(
      document.querySelectorAll<HTMLButtonElement>('#glossary-list .glossary-entry-btn'),
    );
    expect(entries).toHaveLength(13);
    expect(entries[0].textContent).toContain('COVER');
    expect(entries[0].textContent).toContain('Cover & Masthead');
    expect(entries[1].textContent).toContain('PAGES 01–02');
    expect(entries[3].textContent).toContain('PAGE 04');
    expect(entries[3].textContent).toContain('Short-Form & Creator Launches');

    // Glossary Pt. I & Pt. II in-book spread also renders chapter headings & jump buttons
    expect(document.querySelectorAll('#glossary-spread-left .glossary-chapter-heading').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('#glossary-spread-right .glossary-chapter-heading').length).toBeGreaterThanOrEqual(2);

    const servicesEntry = entries.find((el) => el.dataset.glossaryIndex === '7')!;
    expect(servicesEntry).toBeDefined();
    servicesEntry.click();
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

    ctrl.goToPage(1);
    expect(scopedTransition).toHaveBeenLastCalledWith(
      expect.objectContaining({ types: ['forward'] }),
    );
    expect(docTransition).not.toHaveBeenCalled();

    ctrl.goToPage(0);
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

  it('locks all pages to cover height, spills overflow onto continuation pages, updates glossary ranges, and recalculates on resize', () => {
    loadIndexDom();
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);

    const header = document.querySelector<HTMLElement>('.site-header')!;
    const pager = document.querySelector<HTMLElement>('.mag-pager')!;
    const cover = document.getElementById('cover')!;
    const book = document.getElementById('mag-book')!;
    const workPage = document.getElementById('work')!;
    const workGrid = document.getElementById('work-grid')!;

    for (let idx = 1; idx <= 3; idx++) {
      const li = document.createElement('li');
      li.className = 'case-card';
      li.dataset.caseId = `case-${idx}`;
      li.textContent = `Campaign Case ${idx}`;
      workGrid.append(li);
    }

    let currentCoverHeight = 600;
    Object.defineProperty(header, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 54, top: 0, left: 0, right: 390, bottom: 54 }),
    });
    Object.defineProperty(pager, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 74, top: 726, left: 0, right: 390, bottom: 800 }),
    });
    Object.defineProperty(cover, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 380, height: currentCoverHeight, top: 54, left: 5, right: 385, bottom: 54 + currentCoverHeight }),
    });
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 380, height: currentCoverHeight, top: 54, left: 5, right: 385, bottom: 54 + currentCoverHeight }),
    });
    Object.defineProperty(workPage, 'scrollHeight', {
      configurable: true,
      get: () => 260 + workGrid.children.length * 160,
    });

    const ctrl = initMagazineBook(document)!;
    expect(document.documentElement.style.getPropertyValue('--mag-header-actual')).toBe('54px');
    expect(document.documentElement.style.getPropertyValue('--mag-pager-actual')).toBe('74px');
    expect(book.style.getPropertyValue('--mag-page-h')).toBe('600px');

    // With 3 cards -> 260 + 480 = 740 > 600 -> case-3 spills to #work--c1
    const pagesAfterInit = ctrl.getPages();
    expect(pagesAfterInit).toHaveLength(15);
    expect(pagesAfterInit[4].id).toBe('work');
    expect(pagesAfterInit[5].id).toBe('work--c1');
    expect(pagesAfterInit[5].element.querySelector('[data-case-id="case-3"]')).not.toBeNull();

    // Glossary displays collapsed topic range PAGES 04–05 for Short-Form & Creator Launches
    const topicBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('#glossary-list .glossary-entry-btn'),
    ).find((el) => el.textContent?.includes('Short-Form & Creator Launches'));
    expect(topicBtn?.textContent).toContain('PAGES 04–05');
    expect(topicBtn?.dataset.glossaryIndex).toBe('4');

    // Navigate onto case-3 continuation page, then resize viewport taller so all 3 cards fit on #work
    ctrl.goToPage(5);
    expect(ctrl.getCurrentIndex()).toBe(5);
    currentCoverHeight = 900;
    window.dispatchEvent(new Event('resize'));

    expect(book.style.getPropertyValue('--mag-page-h')).toBe('900px');
    const pagesAfterGrow = ctrl.getPages();
    expect(pagesAfterGrow).toHaveLength(14);
    expect(ctrl.getCurrentIndex()).toBe(4); // Anchored cleanly onto #work containing case-3!
    expect(workGrid.querySelectorAll('.case-card')).toHaveLength(3);

    ctrl.openGlossary();
    const updatedTopicBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('#glossary-list .glossary-entry-btn'),
    ).find((el) => el.textContent?.includes('Short-Form & Creator Launches'));
    expect(updatedTopicBtn?.textContent).toContain('PAGE 04');

    ctrl.destroy();
  });

  it('animates sequentially through intermediate pages when skipping via the page selector dots', () => {
    loadIndexDom();
    const book = document.getElementById('mag-book')!;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('56rem'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 1000, height: 700, top: 60, left: 0, right: 1000, bottom: 760 }),
    });

    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const ctrl = initMagazineBook(document)!;
    const dot5 = document.querySelector<HTMLButtonElement>('#mag-page-dots [data-page-target="5"]')!;
    expect(dot5).not.toBeNull();

    // Skipping from Cover (0) to spread [5, 6] must flip step-by-step: 0 -> 1 -> 3 -> 5
    dot5.click();
    expect(ctrl.getCurrentIndex()).toBe(0);
    expect(book.classList.contains('is-curling-forward')).toBe(true);

    let now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const visited: number[] = [];
    for (let guard = 0; guard < 40 && rafQueue.length > 0; guard++) {
      now += 250;
      const cb = rafQueue.shift()!;
      cb(now);
      if (visited[visited.length - 1] !== ctrl.getCurrentIndex()) {
        visited.push(ctrl.getCurrentIndex());
      }
    }

    expect(visited).toEqual(expect.arrayContaining([1, 3, 5]));
    expect(ctrl.getCurrentIndex()).toBe(5);
    expect(book.classList.contains('is-curling')).toBe(false);

    ctrl.destroy();
  });

  it('activates double-page spread on foldable inner screens such as Pixel 10 Pro Fold', () => {
    loadIndexDom();
    const book = document.getElementById('mag-book')!;
    // Simulate Pixel 10 Pro Fold inner display (~692x717 CSS px -> matches 37.5rem + 28rem, not 56rem)
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('37.5rem'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 692, height: 610, top: 54, left: 0, right: 692, bottom: 664 }),
    });

    const ctrl = initMagazineBook(document)!;
    expect(book.classList.contains('is-double-spread')).toBe(true);
    expect(book.classList.contains('is-cover-spread-active')).toBe(true);

    ctrl.nextPage();
    expect(ctrl.getCurrentIndex()).toBe(1);
    const pages = ctrl.getPages();
    expect(pages[1].element.hidden).toBe(false);
    expect(pages[2].element.hidden).toBe(false);
    expect(pages[1].element.classList.contains('is-left-sheet')).toBe(true);
    expect(pages[2].element.classList.contains('is-right-sheet')).toBe(true);

    ctrl.destroy();
  });

  it('pushes overflowing sticker cutouts and right-column cards on page 5 to a continuation page when bounded by cover height', () => {
    loadIndexDom();
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);

    const cover = document.getElementById('cover')!;
    const book = document.getElementById('mag-book')!;
    const work2 = document.getElementById('work-2')!;
    const photosWrap = work2.querySelector<HTMLElement>('[data-page-photos="work-2"]')!;
    const stickers = Array.from(photosWrap.querySelectorAll<HTMLElement>('.mag-photo-figure'));
    const rightCards = Array.from(
      work2.querySelectorAll<HTMLElement>('.mag-ref-right-col > .mag-right-dossier, .mag-ref-right-col > .mag-note-box'),
    );

    Object.defineProperty(cover, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 560, top: 0, left: 0, right: 390, bottom: 560 }),
    });
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 560, top: 0, left: 0, right: 390, bottom: 560 }),
    });
    Object.defineProperty(work2, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 560, top: 0, left: 0, right: 390, bottom: 560 }),
    });

    // Simulate sticker cutouts #3 and #4 plus right-col note card extending beyond 560px cover height
    stickers.forEach((fig, idx) => {
      Object.defineProperty(fig, 'getBoundingClientRect', {
        configurable: true,
        value: () => {
          if (fig.closest('#work-2')) {
            const bottom = idx >= 2 ? 680 : 320;
            return { width: 120, height: 180, top: bottom - 180, left: 0, right: 120, bottom };
          }
          return { width: 120, height: 180, top: 100, left: 0, right: 120, bottom: 280 };
        },
      });
    });

    rightCards.forEach((card) => {
      Object.defineProperty(card, 'getBoundingClientRect', {
        configurable: true,
        value: () =>
          card.closest('#work-2')
            ? { width: 120, height: 140, top: 470, left: 240, right: 360, bottom: 610 }
            : { width: 120, height: 140, top: 120, left: 240, right: 360, bottom: 260 },
      });
    });

    const ctrl = initMagazineBook(document)!;
    const pages = ctrl.getPages();
    expect(pages.length).toBeGreaterThan(14);
    expect(pages[5].id).toBe('work-2');
    expect(pages[6].id).toBe('work-2--c1');
    // Overflowing stickers & note box moved onto continuation page #work-2--c1
    expect(pages[6].element.querySelectorAll('.mag-photo-figure').length).toBeGreaterThanOrEqual(2);
    expect(pages[5].element.querySelectorAll('.mag-photo-figure').length).toBeLessThanOrEqual(2);

    ctrl.destroy();
  });

  it('keeps active inner page locked during navigation and ignores mid-visit image loads on visible pages', () => {
    loadIndexDom();
    vi.stubGlobal('requestAnimationFrame', undefined as unknown as typeof requestAnimationFrame);

    const cover = document.getElementById('cover')!;
    const book = document.getElementById('mag-book')!;
    let coverHeightCalls = 0;
    Object.defineProperty(cover, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        coverHeightCalls += 1;
        return { width: 390, height: 600, top: 0, left: 0, right: 390, bottom: 600 };
      },
    });
    Object.defineProperty(book, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 390, height: 600, top: 0, left: 0, right: 390, bottom: 600 }),
    });

    const ctrl = initMagazineBook(document)!;
    const initialMeasureCount = coverHeightCalls;
    ctrl.goToPage(5);
    // Turning to Page 5 must NOT re-measure Cover or strip --mag-page-h
    expect(coverHeightCalls).toBe(initialMeasureCount);
    expect(book.style.getPropertyValue('--mag-page-h')).toBe('600px');

    // Passive image load event on active visible Page 5 or fixed-ratio mini-trio/cover images must NOT trigger reflow
    const img = document.querySelector<HTMLImageElement>('#work-2 .mag-photo-img')!;
    img.dispatchEvent(new Event('load', { bubbles: false }));
    const trioImg = document.querySelector<HTMLImageElement>('#work-2 .mag-ref-mini-trio img')!;
    trioImg.dispatchEvent(new Event('load', { bubbles: false }));
    const coverImg = document.querySelector<HTMLImageElement>('#cover .mag-cover-backdrop img')!;
    coverImg.dispatchEvent(new Event('load', { bubbles: false }));
    expect(coverHeightCalls).toBe(initialMeasureCount);
    expect(ctrl.getCurrentIndex()).toBe(5);

    ctrl.destroy();
  });

  it('replaces and removes both floating page stickers and sidebar note-box stickers via renderPagePhotos', () => {
    loadIndexDom();
    renderPagePhotos(document, {
      work: [{ id: 's1', src: '/magazines/cutouts/mag-12.png', caption: 'New Sticker' }],
      'note-work': [{ id: 'nw1', src: '/magazines/cutouts/mag-01.png', caption: 'Replaced Note Sticker' }],
      'note-events': [],
    });

    const workImgs = document.querySelectorAll<HTMLImageElement>('#work [data-page-photos="work"] .mag-photo-img');
    expect(workImgs).toHaveLength(1);
    expect(workImgs[0].getAttribute('src')).toBe('/magazines/cutouts/mag-12.png');

    const workNoteCutout = document.querySelector<HTMLImageElement>('[data-page-note-cutout="work"]')!;
    expect(workNoteCutout.hidden).toBe(false);
    expect(workNoteCutout.getAttribute('src')).toBe('/magazines/cutouts/mag-01.png');

    const eventsNoteCutout = document.querySelector<HTMLImageElement>('[data-page-note-cutout="events"]')!;
    expect(eventsNoteCutout.hidden).toBe(true);
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

  it('keeps inner custom pages hidden until pagination and dismisses the loading screen once spreads settle', async () => {
    loadIndexDom();
    const stage = document.querySelector<HTMLElement>('.mag-stage')!;
    const loader = document.getElementById('mag-loading-screen')!;
    const progress = loader.querySelector<HTMLProgressElement>('progress.loading-spinner')!;

    expect(stage.classList.contains('is-mag-loading')).toBe(true);
    expect(loader.getAttribute('aria-busy')).toBe('true');
    expect(loader.hidden).toBe(false);
    expect(progress.hasAttribute('value')).toBe(false);

    // Custom sections must be created hidden so wide-screen CSS Grid cannot flash them beside Cover during CMS fetch
    renderCustomSections(document.getElementById('custom-sections-root'), [
      {
        id: 'cms-test-feature',
        eyebrow: 'Drop',
        heading: 'Late CMS Feature',
        subtitle: 'Loaded during hydration.',
        elements: [],
      },
    ]);
    expect(document.getElementById('custom-cms-test-feature')?.hidden).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    await bootstrapApp(document);

    expect(stage.classList.contains('is-mag-loading')).toBe(false);
    expect(loader.getAttribute('aria-busy')).toBe('false');
    expect(loader.hidden).toBe(true);
    expect(document.getElementById('cover')?.hidden).toBe(false);
  });
});
