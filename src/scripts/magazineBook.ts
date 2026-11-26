export interface MagazinePageMeta {
  index: number;
  id: string;
  chapter: string;
  folio: string;
  title: string;
  description: string;
  element: HTMLElement;
}

export interface MagazineBookController {
  getPages: () => MagazinePageMeta[];
  getCurrentIndex: () => number;
  goToPage: (index: number) => void;
  goToPageById: (id: string) => boolean;
  nextPage: () => void;
  prevPage: () => void;
  openGlossary: () => void;
  refresh: () => void;
  destroy: () => void;
}

const DOUBLE_SPREAD_QUERY = '(min-width: 56rem)';

function prefersReducedMotion(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function isDoubleSpreadViewport(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(DOUBLE_SPREAD_QUERY)?.matches,
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function snapToSpreadAnchor(index: number, total: number, doubleSpread: boolean): number {
  if (total <= 0) return 0;
  const clamped = Math.max(0, Math.min(total - 1, index));
  if (!doubleSpread || clamped === 0) return clamped;
  return clamped % 2 === 1 ? clamped : clamped - 1;
}

function getVisibleIndicesForAnchor(
  anchor: number,
  total: number,
  doubleSpread: boolean,
): number[] {
  if (total <= 0) return [];
  const safeAnchor = snapToSpreadAnchor(anchor, total, doubleSpread);
  if (!doubleSpread || safeAnchor === 0) return [safeAnchor];
  return safeAnchor + 1 < total ? [safeAnchor, safeAnchor + 1] : [safeAnchor];
}

function getAdjacentAnchor(
  currentAnchor: number,
  direction: 'forward' | 'backward',
  total: number,
  doubleSpread: boolean,
): number | null {
  if (total <= 0) return null;
  if (!doubleSpread) {
    const next = direction === 'forward' ? currentAnchor + 1 : currentAnchor - 1;
    return next >= 0 && next < total ? next : null;
  }
  if (direction === 'forward') {
    const next = currentAnchor === 0 ? 1 : currentAnchor + 2;
    return next < total ? next : null;
  }
  if (currentAnchor <= 0) return null;
  if (currentAnchor <= 1) return 0;
  return Math.max(1, currentAnchor - 2);
}

interface ChapterGroup {
  chapter: string;
  entries: MagazinePageMeta[];
}

function groupPagesByChapter(pages: readonly MagazinePageMeta[]): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  const byName = new Map<string, ChapterGroup>();

  for (const page of pages) {
    let group = byName.get(page.chapter);
    if (!group) {
      group = { chapter: page.chapter, entries: [] };
      byName.set(page.chapter, group);
      groups.push(group);
    }
    group.entries.push(page);
  }
  return groups;
}

function createGlossaryEntryNode(
  page: MagazinePageMeta,
  visibleIndices: readonly number[],
  compact = false,
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'glossary-item';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = compact ? 'glossary-entry-btn is-compact' : 'glossary-entry-btn';
  btn.dataset.glossaryIndex = String(page.index);
  if (visibleIndices.includes(page.index)) {
    btn.setAttribute('aria-current', 'page');
  }

  const top = document.createElement('div');
  top.className = 'glossary-entry-top';

  const folio = document.createElement('span');
  folio.className = 'glossary-folio';
  folio.textContent = page.folio;

  const title = document.createElement('strong');
  title.className = 'glossary-entry-title';
  title.textContent = page.title;

  top.append(folio, title);

  const desc = document.createElement('p');
  desc.className = 'glossary-entry-desc';
  desc.textContent = page.description;

  btn.append(top, desc);
  li.append(btn);
  return li;
}

function renderChapterGroupNodes(
  groups: readonly ChapterGroup[],
  visibleIndices: readonly number[],
  compact = false,
): HTMLLIElement[] {
  return groups.map((group) => {
    const li = document.createElement('li');
    li.className = 'glossary-chapter-group';

    const heading = document.createElement('h3');
    heading.className = 'glossary-chapter-heading';
    heading.textContent = group.chapter;

    const list = document.createElement('ol');
    list.className = 'glossary-chapter-list';
    list.append(
      ...group.entries.map((page) => createGlossaryEntryNode(page, visibleIndices, compact)),
    );

    li.append(heading, list);
    return li;
  });
}

export function initMagazineBook(root: ParentNode = document): MagazineBookController | null {
  const book = root.querySelector<HTMLElement>('#mag-book');
  if (!book) return null;

  const prevBtn = root.querySelector<HTMLButtonElement>('#mag-prev-btn');
  const nextBtn = root.querySelector<HTMLButtonElement>('#mag-next-btn');
  const dotsContainer = root.querySelector<HTMLElement>('#mag-page-dots');
  const statusEl = root.querySelector<HTMLElement>('#mag-page-status');
  const glossaryDialog = root.querySelector<HTMLDialogElement>('#glossary-dialog');
  const glossaryList = root.querySelector<HTMLElement>('#glossary-list');
  const glossarySpreadLeft = root.querySelector<HTMLElement>('#glossary-spread-left');
  const glossarySpreadRight = root.querySelector<HTMLElement>('#glossary-spread-right');
  const coverGlossaryBtn = root.querySelector<HTMLButtonElement>('#open-glossary-btn');
  const pagerGlossaryBtn = root.querySelector<HTMLButtonElement>('#pager-glossary-btn');
  const coverReadBtn = root.querySelector<HTMLButtonElement>('#cover-read-btn');
  const siteLogo = root.querySelector<HTMLAnchorElement>('.site-header .site-logo');
  const curlFlapHost = root.querySelector<HTMLElement>('.mag-curl-flap-host');
  const curlFlap = root.querySelector<HTMLElement>('#mag-curl-flap');

  let currentIndex = 0;
  let flipTimer: ReturnType<typeof setTimeout> | undefined;
  let settleRafId = 0;
  let pendingSettleFinish: (() => void) | null = null;
  let suppressNextClick = false;
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;

  interface CurlSession {
    pointerId: number;
    startX: number;
    startY: number;
    touchYRatio: number;
    startTime: number;
    locked: 'horizontal' | 'vertical' | null;
    direction: 'forward' | 'backward' | null;
    targetIndex: number;
    progress: number;
    doubleSpread: boolean;
    topEls: HTMLElement[];
    underEls: HTMLElement[];
    pages: MagazinePageMeta[];
  }

  let curlSession: CurlSession | null = null;

  const collectPages = (): MagazinePageMeta[] => {
    const rawPages = Array.from(book.querySelectorAll<HTMLElement>('[data-mag-page]')).filter(
      (el) => el.dataset.sectionHidden !== 'true',
    );
    const totalInterior = Math.max(0, rawPages.length - 1);

    return rawPages.map((el, index) => {
      const id = el.dataset.magPage || `page-${index}`;
      const chapter =
        el.dataset.magChapter || (index === 0 ? 'Front Matter' : 'Special Features');
      const dynamicTitle =
        id === 'cover'
          ? el.dataset.magTitle || 'Cover & Masthead'
          : el.querySelector<HTMLElement>('.section-title')?.textContent?.trim() ||
            el.dataset.magTitle ||
            'Magazine Page';
      const dynamicDesc =
        (id === 'cover'
          ? el.dataset.magDesc
          : el.querySelector<HTMLElement>('.section-subtitle')?.textContent?.trim()) ||
        el.dataset.magDesc ||
        'Editorial feature inside Main Character Media.';
      const folio = index === 0 ? 'COVER' : `PAGE ${String(index).padStart(2, '0')}`;

      const folioEl = el.querySelector<HTMLElement>('.mag-folio-number');
      if (folioEl) {
        folioEl.textContent = `${folio} / ${String(totalInterior).padStart(2, '0')}`;
      }
      const ovalEl = el.querySelector<HTMLElement>('.mag-folio-oval');
      if (ovalEl && index > 0) {
        ovalEl.textContent = String(index).padStart(2, '0');
      }

      return {
        index,
        id,
        chapter,
        folio,
        title: dynamicTitle,
        description: dynamicDesc,
        element: el,
      };
    });
  };

  const renderGlossary = (pages: MagazinePageMeta[], visibleIndices: readonly number[]) => {
    const groups = groupPagesByChapter(pages);

    if (glossaryList) {
      glossaryList.replaceChildren(...renderChapterGroupNodes(groups, visibleIndices, false));
    }

    if (glossarySpreadLeft && glossarySpreadRight) {
      // Split chapters cleanly across the two-page Glossary opening spread
      const totalEntries = pages.length;
      const leftGroups: ChapterGroup[] = [];
      const rightGroups: ChapterGroup[] = [];
      let countSoFar = 0;

      for (const grp of groups) {
        if (leftGroups.length === 0 || countSoFar < Math.ceil(totalEntries * 0.45)) {
          leftGroups.push(grp);
        } else {
          rightGroups.push(grp);
        }
        countSoFar += grp.entries.length;
      }

      const leftList = document.createElement('ol');
      leftList.className = 'glossary-list is-in-spread';
      leftList.append(...renderChapterGroupNodes(leftGroups, visibleIndices, true));
      glossarySpreadLeft.replaceChildren(leftList);

      const rightList = document.createElement('ol');
      rightList.className = 'glossary-list is-in-spread';
      rightList.append(...renderChapterGroupNodes(rightGroups, visibleIndices, true));
      glossarySpreadRight.replaceChildren(rightList);
    }
  };

  const renderPager = (pages: MagazinePageMeta[], visibleIndices: readonly number[]) => {
    const doubleSpread = isDoubleSpreadViewport();
    const prevAnchor = getAdjacentAnchor(currentIndex, 'backward', pages.length, doubleSpread);
    const nextAnchor = getAdjacentAnchor(currentIndex, 'forward', pages.length, doubleSpread);

    if (prevBtn) {
      prevBtn.disabled = prevAnchor === null;
      const prevTitle = prevAnchor !== null ? pages[prevAnchor]?.title : '';
      prevBtn.setAttribute('aria-label', prevTitle ? `Previous page: ${prevTitle}` : 'Previous page');
    }

    if (nextBtn) {
      nextBtn.disabled = nextAnchor === null;
      const nextTitle = nextAnchor !== null ? pages[nextAnchor]?.title : '';
      nextBtn.setAttribute('aria-label', nextTitle ? `Next page: ${nextTitle}` : 'Next page');
    }

    if (statusEl && visibleIndices.length > 0) {
      const firstPage = pages[visibleIndices[0]];
      const secondPage = visibleIndices.length > 1 ? pages[visibleIndices[1]] : null;
      if (firstPage && secondPage) {
        const range = `PAGES ${String(firstPage.index).padStart(2, '0')}–${String(secondPage.index).padStart(2, '0')}`;
        statusEl.textContent = `${range} · ${firstPage.chapter}`;
      } else if (firstPage) {
        statusEl.textContent = `${firstPage.folio} · ${firstPage.title}`;
      }
    }

    if (dotsContainer) {
      dotsContainer.replaceChildren(
        ...pages.map((page) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'mag-dot-btn';
          dot.dataset.pageTarget = String(page.index);
          dot.textContent = page.index === 0 ? 'Cover' : String(page.index).padStart(2, '0');
          dot.setAttribute('aria-label', `Go to ${page.folio}: ${page.title}`);
          if (visibleIndices.includes(page.index)) {
            dot.setAttribute('aria-current', 'page');
          }
          return dot;
        }),
      );
    }

    renderGlossary(pages, visibleIndices);
  };

  const applyActivePageDom = (pages: MagazinePageMeta[], targetIndex: number) => {
    const doubleSpread = isDoubleSpreadViewport();
    const anchor = snapToSpreadAnchor(targetIndex, pages.length, doubleSpread);
    const visible = getVisibleIndicesForAnchor(anchor, pages.length, doubleSpread);
    const isCover = anchor === 0;

    book.classList.toggle('is-double-spread', doubleSpread);
    book.classList.toggle('is-cover-spread-active', doubleSpread && isCover);

    pages.forEach((p, i) => {
      const isVisible = visible.includes(i);
      p.element.hidden = !isVisible;
      p.element.classList.toggle('is-active-page', isVisible);
      p.element.classList.toggle('is-left-sheet', doubleSpread && !isCover && i === visible[0]);
      p.element.classList.toggle(
        'is-right-sheet',
        doubleSpread && !isCover && visible.length > 1 && i === visible[1],
      );
    });

    currentIndex = anchor;
    renderPager(pages, visible);
  };

  const clearCurlVisuals = () => {
    if (settleRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(settleRafId);
      settleRafId = 0;
    }
    pendingSettleFinish = null;
    book.classList.remove('is-curling', 'is-curling-forward', 'is-curling-backward');
    book.style.removeProperty('--curl-p');
    if (curlFlapHost) {
      curlFlapHost.classList.remove('is-visible');
    }
    if (curlFlap) {
      curlFlap.style.removeProperty('clip-path');
      curlFlap.style.removeProperty('opacity');
    }
    book.querySelectorAll<HTMLElement>('[data-mag-page]').forEach((el) => {
      el.classList.remove('is-curl-top', 'is-curl-underneath', 'is-left-sheet', 'is-right-sheet');
      el.style.removeProperty('clip-path');
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
    });
  };

  // Synchronously commit any in-flight curl settle before starting a new swipe or jump
  // so rapid consecutive swipes advance page-by-page instead of cancelling the previous turn.
  const flushPendingSettle = () => {
    if (!pendingSettleFinish) {
      clearCurlVisuals();
      return;
    }
    const finish = pendingSettleFinish;
    pendingSettleFinish = null;
    finish();
  };

  const applyCurlProgress = (
    topEls: HTMLElement[],
    underEls: HTMLElement[],
    direction: 'forward' | 'backward',
    rawProgress: number,
    touchYRatio = 0.78,
  ) => {
    const p = clamp(rawProgress, 0, 1);
    book.style.setProperty('--curl-p', p.toFixed(4));

    if (prefersReducedMotion()) {
      const topOpacity = direction === 'forward' ? String(clamp(1 - p, 0, 1)) : String(p);
      topEls.forEach((el) => {
        el.style.opacity = topOpacity;
      });
      underEls.forEach((el) => {
        el.style.opacity = '1';
      });
      return;
    }

    const curlRatio = direction === 'forward' ? p : 1 - p;
    const peelArc = Math.sin(curlRatio * Math.PI);
    const bias = (touchYRatio - 0.5) * 38 * peelArc;
    const creaseTop = clamp(100 - curlRatio * 124 + bias, -30, 100);
    const creaseBot = clamp(100 - curlRatio * 124 - bias, -30, 100);

    const hasSplitDoubleTop =
      topEls.length > 0 && topEls.some((el) => el.classList.contains('is-left-sheet'));

    if (hasSplitDoubleTop) {
      const leftSheet = topEls.find((el) => el.classList.contains('is-left-sheet'));
      const rightSheet = topEls.find((el) => el.classList.contains('is-right-sheet'));
      if (leftSheet) {
        const lTop = clamp(creaseTop * 2, 0, 100);
        const lBot = clamp(creaseBot * 2, 0, 100);
        leftSheet.style.clipPath = `polygon(0% 0%, ${lTop.toFixed(2)}% 0%, ${lBot.toFixed(2)}% 100%, 0% 100%)`;
        leftSheet.style.opacity = '1';
      }
      if (rightSheet) {
        const rTop = clamp((creaseTop - 50) * 2, 0, 100);
        const rBot = clamp((creaseBot - 50) * 2, 0, 100);
        rightSheet.style.clipPath = `polygon(0% 0%, ${rTop.toFixed(2)}% 0%, ${rBot.toFixed(2)}% 100%, 0% 100%)`;
        rightSheet.style.opacity = '1';
      }
    } else {
      topEls.forEach((el) => {
        el.style.clipPath = `polygon(0% 0%, ${creaseTop.toFixed(2)}% 0%, ${creaseBot.toFixed(2)}% 100%, 0% 100%)`;
        el.style.opacity = '1';
      });
    }

    if (curlFlap && curlFlapHost) {
      const flapWidth = clamp(peelArc * 30 + curlRatio * 6, 0, 32);
      const topFlapX = clamp(creaseTop - flapWidth * (touchYRatio >= 0.5 ? 0.65 : 1.15), -35, 100);
      const botFlapX = clamp(creaseBot - flapWidth * (touchYRatio >= 0.5 ? 1.15 : 0.65), -35, 100);
      const showFlap = curlRatio > 0.005 && curlRatio < 0.995;
      curlFlapHost.classList.toggle('is-visible', showFlap);
      curlFlap.style.clipPath = `polygon(${topFlapX.toFixed(2)}% 0%, ${creaseTop.toFixed(2)}% 0%, ${creaseBot.toFixed(2)}% 100%, ${botFlapX.toFixed(2)}% 100%)`;
      curlFlap.style.opacity = showFlap ? '1' : '0';
    }

    const underBrightness = 0.86 + (1 - curlRatio) * 0.14;
    underEls.forEach((el) => {
      el.style.filter = `brightness(${underBrightness.toFixed(3)})`;
      el.style.opacity = '1';
    });
  };

  const focusPageHeading = (el: HTMLElement | undefined) => {
    const heading = el?.querySelector<HTMLElement>('h1, h2');
    heading?.focus?.({ preventScroll: true });
  };

  const finalizeCurlSettle = (
    pages: MagazinePageMeta[],
    direction: 'forward' | 'backward',
    startP: number,
    endP: number,
    topEls: HTMLElement[],
    underEls: HTMLElement[],
    commitIndex: number | null,
    touchYRatio = 0.78,
  ) => {
    const finish = () => {
      clearCurlVisuals();
      if (commitIndex !== null) {
        applyActivePageDom(pages, commitIndex);
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
        focusPageHeading(pages[commitIndex]?.element);
      } else {
        applyActivePageDom(pages, currentIndex);
      }
    };

    if (
      prefersReducedMotion() ||
      typeof requestAnimationFrame !== 'function' ||
      Math.abs(endP - startP) < 0.01
    ) {
      finish();
      return;
    }

    pendingSettleFinish = finish;
    const duration = 150;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const step = (now: number) => {
      if (pendingSettleFinish !== finish) return;
      const elapsed = Math.min(1, Math.max(0, (now - startTime) / duration));
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const currentP = startP + (endP - startP) * eased;
      applyCurlProgress(topEls, underEls, direction, currentP, touchYRatio);
      if (elapsed < 1) {
        settleRafId = requestAnimationFrame(step);
      } else {
        settleRafId = 0;
        pendingSettleFinish = null;
        finish();
      }
    };
    settleRafId = requestAnimationFrame(step);
  };

  const triggerFallbackFlip = (direction: 'forward' | 'backward') => {
    if (prefersReducedMotion()) return;
    clearTimeout(flipTimer);
    book.classList.remove('is-flipping-forward', 'is-flipping-backward');
    void book.offsetWidth;
    book.classList.add(direction === 'forward' ? 'is-flipping-forward' : 'is-flipping-backward');
    flipTimer = setTimeout(() => {
      book.classList.remove('is-flipping-forward', 'is-flipping-backward');
    }, 520);
  };

  const goToPage = (targetIndex: number) => {
    flushPendingSettle();
    const pages = collectPages();
    if (pages.length === 0) return;

    const doubleSpread = isDoubleSpreadViewport();
    const anchor = snapToSpreadAnchor(targetIndex, pages.length, doubleSpread);
    if (
      anchor === currentIndex &&
      pages[anchor]?.element.classList.contains('is-active-page')
    ) {
      return;
    }

    const direction: 'forward' | 'backward' = anchor >= currentIndex ? 'forward' : 'backward';
    const scopedBook = book as HTMLElement & {
      startViewTransition?: (opts: { update: () => void; types?: string[] } | (() => void)) => {
        ready?: Promise<void>;
        finished?: Promise<void>;
      };
    };

    const updateDom = () => {
      applyActivePageDom(pages, anchor);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
      focusPageHeading(pages[anchor]?.element);
    };

    if (!prefersReducedMotion() && typeof scopedBook.startViewTransition === 'function') {
      try {
        const transition = scopedBook.startViewTransition({
          update: updateDom,
          types: [direction],
        });
        transition?.ready?.catch?.(() => {});
      } catch {
        updateDom();
        triggerFallbackFlip(direction);
      }
    } else {
      updateDom();
      triggerFallbackFlip(direction);
    }
  };

  const goToPageById = (id: string): boolean => {
    const cleanId = id.replace(/^#/, '');
    const safeSelectorId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(cleanId)
        : cleanId.replace(/[^a-zA-Z0-9_-]/g, '');
    const pages = collectPages();
    const match = pages.find(
      (p) =>
        p.id === cleanId ||
        p.element.id === cleanId ||
        p.element.dataset.section === cleanId ||
        (safeSelectorId ? p.element.querySelector(`#${safeSelectorId}`) !== null : false),
    );
    if (!match) return false;
    goToPage(match.index);
    return true;
  };

  const nextPage = () => {
    const pages = collectPages();
    const nextAnchor = getAdjacentAnchor(
      currentIndex,
      'forward',
      pages.length,
      isDoubleSpreadViewport(),
    );
    if (nextAnchor !== null) goToPage(nextAnchor);
  };

  const prevPage = () => {
    const pages = collectPages();
    const prevAnchor = getAdjacentAnchor(
      currentIndex,
      'backward',
      pages.length,
      isDoubleSpreadViewport(),
    );
    if (prevAnchor !== null) goToPage(prevAnchor);
  };

  const openGlossary = () => {
    const pages = collectPages();
    const visible = getVisibleIndicesForAnchor(
      currentIndex,
      pages.length,
      isDoubleSpreadViewport(),
    );
    renderGlossary(pages, visible);
    if (!glossaryDialog) return;
    if (typeof glossaryDialog.showModal === 'function') {
      glossaryDialog.showModal();
    } else {
      glossaryDialog.setAttribute('open', '');
    }
  };

  const closeGlossary = () => {
    if (!glossaryDialog) return;
    if (typeof glossaryDialog.close === 'function' && glossaryDialog.open) {
      glossaryDialog.close();
    } else {
      glossaryDialog.removeAttribute('open');
    }
  };

  const refresh = () => {
    const pages = collectPages();
    const safeIdx = Math.min(currentIndex, Math.max(0, pages.length - 1));
    applyActivePageDom(pages, safeIdx);
  };

  const handlePrev = () => prevPage();
  const handleNext = () => nextPage();
  const handleOpenGlossary = () => openGlossary();
  const handleCoverRead = () => goToPage(1);

  const handleLogoClick = (e: Event) => {
    e.preventDefault();
    goToPage(0);
  };

  const handleDotsClick = (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-page-target]');
    if (!btn) return;
    goToPage(Number(btn.dataset.pageTarget));
  };

  const handleGlossaryClick = (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-glossary-index]');
    if (!btn) return;
    const idx = Number(btn.dataset.glossaryIndex);
    closeGlossary();
    goToPage(idx);
  };

  const handleDocumentLinkClick = (e: Event) => {
    const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (href === '#top' || href === '#cover') {
      e.preventDefault();
      goToPage(0);
      return;
    }
    if (goToPageById(href)) {
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        (active as HTMLElement).isContentEditable)
    ) {
      return;
    }
    if (glossaryDialog?.open) return;
    if (e.key === 'ArrowRight') {
      nextPage();
    } else if (e.key === 'ArrowLeft') {
      prevPage();
    }
  };

  const handleGlossaryClose = () => {
    if (glossaryDialog) glossaryDialog.returnValue = '';
  };

  if (glossaryDialog && typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e: PointerEvent) => {
      const r = glossaryDialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    glossaryDialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    glossaryDialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) glossaryDialog.close();
      pressedOutside = false;
    });
  }

  const isNonSwipeFormControl = (target: EventTarget | null): boolean => {
    const el = target instanceof Element ? target : null;
    if (!el) return false;
    return (
      el.closest('input, textarea, select, label, [contenteditable="true"], .filter-bar') !== null
    );
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.button !== undefined && e.button !== 0)) return;
    if (glossaryDialog?.open || isNonSwipeFormControl(e.target)) return;

    flushPendingSettle();
    const pages = collectPages();
    if (pages.length <= 1) return;
    const rect = book.getBoundingClientRect?.();
    const initialYRatio =
      rect && rect.height > 0 ? clamp((e.clientY - rect.top) / rect.height, 0.12, 0.88) : 0.78;
    curlSession = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      touchYRatio: initialYRatio,
      startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      locked: null,
      direction: null,
      targetIndex: currentIndex,
      progress: 0,
      doubleSpread: isDoubleSpreadViewport(),
      topEls: [],
      underEls: [],
      pages,
    };
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!curlSession || e.pointerId !== curlSession.pointerId) return;
    const dx = e.clientX - curlSession.startX;
    const dy = e.clientY - curlSession.startY;

    if (curlSession.locked === 'vertical') return;

    if (!curlSession.locked) {
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx) * 1.35) {
        curlSession.locked = 'vertical';
        curlSession = null;
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 0.95) {
        return;
      }

      const direction: 'forward' | 'backward' = dx < 0 ? 'forward' : 'backward';
      const targetIndex = getAdjacentAnchor(
        currentIndex,
        direction,
        curlSession.pages.length,
        curlSession.doubleSpread,
      );
      if (targetIndex === null) {
        curlSession = null;
        return;
      }

      const curGroupIndices = getVisibleIndicesForAnchor(
        currentIndex,
        curlSession.pages.length,
        curlSession.doubleSpread,
      );
      const destGroupIndices = getVisibleIndicesForAnchor(
        targetIndex,
        curlSession.pages.length,
        curlSession.doubleSpread,
      );

      const assignSheetSides = (indices: number[], cls: string): HTMLElement[] => {
        const anchor = indices[0] ?? 0;
        const els: HTMLElement[] = [];
        indices.forEach((idx, pos) => {
          const el = curlSession!.pages[idx]?.element;
          if (!el) return;
          el.hidden = false;
          el.classList.add(cls);
          if (curlSession!.doubleSpread && anchor > 0) {
            el.classList.toggle('is-left-sheet', pos === 0);
            el.classList.toggle('is-right-sheet', pos === 1);
          } else {
            el.classList.remove('is-left-sheet', 'is-right-sheet');
          }
          els.push(el);
        });
        return els;
      };

      const curEls = assignSheetSides(
        curGroupIndices,
        direction === 'forward' ? 'is-curl-top' : 'is-curl-underneath',
      );
      const destEls = assignSheetSides(
        destGroupIndices,
        direction === 'forward' ? 'is-curl-underneath' : 'is-curl-top',
      );

      if (curEls.length === 0 || destEls.length === 0) {
        curlSession = null;
        return;
      }

      curlSession.locked = 'horizontal';
      curlSession.direction = direction;
      curlSession.targetIndex = targetIndex;
      curlSession.topEls = direction === 'forward' ? curEls : destEls;
      curlSession.underEls = direction === 'forward' ? destEls : curEls;

      book.classList.remove('is-cover-spread-active');
      book.classList.add(
        'is-curling',
        direction === 'forward' ? 'is-curling-forward' : 'is-curling-backward',
      );
      book.setPointerCapture?.(e.pointerId);
    }

    if (
      curlSession.locked === 'horizontal' &&
      curlSession.direction &&
      curlSession.topEls.length > 0 &&
      curlSession.underEls.length > 0
    ) {
      const rect = book.getBoundingClientRect();
      const bookWidth = Math.max(280, rect.width || 390);
      if (rect.height > 0) {
        curlSession.touchYRatio = clamp((e.clientY - rect.top) / rect.height, 0.12, 0.88);
      }
      const directionalDelta = curlSession.direction === 'forward' ? -dx : dx;
      const dragSpan = curlSession.doubleSpread ? bookWidth * 0.52 : bookWidth * 0.7;
      const progress = clamp(directionalDelta / dragSpan, 0, 1);
      curlSession.progress = progress;
      applyCurlProgress(
        curlSession.topEls,
        curlSession.underEls,
        curlSession.direction,
        progress,
        curlSession.touchYRatio,
      );
    }
  };

  const finishPointerCurl = (e: PointerEvent, forceCancel = false) => {
    if (!curlSession || e.pointerId !== curlSession.pointerId) return;
    const session = curlSession;
    curlSession = null;

    if (book.hasPointerCapture?.(e.pointerId)) {
      book.releasePointerCapture?.(e.pointerId);
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.max(16, now - session.startTime);
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;

    if (session.locked === null && !forceCancel) {
      if (Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        const direction: 'forward' | 'backward' = dx < 0 ? 'forward' : 'backward';
        const targetIndex = getAdjacentAnchor(
          currentIndex,
          direction,
          session.pages.length,
          session.doubleSpread,
        );
        if (targetIndex !== null) {
          suppressNextClick = true;
          clearTimeout(suppressClickTimer);
          suppressClickTimer = setTimeout(() => {
            suppressNextClick = false;
          }, 300);
          goToPage(targetIndex);
        }
      }
      return;
    }

    if (
      session.locked !== 'horizontal' ||
      !session.direction ||
      session.topEls.length === 0 ||
      session.underEls.length === 0
    ) {
      return;
    }

    suppressNextClick = true;
    clearTimeout(suppressClickTimer);
    suppressClickTimer = setTimeout(() => {
      suppressNextClick = false;
    }, 300);

    const directionalVelocity = (session.direction === 'forward' ? -dx : dx) / dt;
    const shouldCommit = !forceCancel
      ? session.progress >= 0.24 || directionalVelocity >= 0.35
      : session.progress >= 0.35;

    finalizeCurlSettle(
      session.pages,
      session.direction,
      session.progress,
      shouldCommit ? 1 : 0,
      session.topEls,
      session.underEls,
      shouldCommit ? session.targetIndex : null,
      session.touchYRatio,
    );
  };

  const handlePointerUp = (e: PointerEvent) => finishPointerCurl(e, false);
  const handlePointerCancel = (e: PointerEvent) => finishPointerCurl(e, true);

  const handleBookClickCapture = (e: Event) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    clearTimeout(suppressClickTimer);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBookDragStart = (e: Event) => {
    if (e.target instanceof Element && e.target.closest('a, img, button')) {
      e.preventDefault();
    }
  };

  const spreadMql =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DOUBLE_SPREAD_QUERY)
      : null;
  const handleViewportChange = () => {
    flushPendingSettle();
    refresh();
  };
  spreadMql?.addEventListener?.('change', handleViewportChange);

  prevBtn?.addEventListener('click', handlePrev);
  nextBtn?.addEventListener('click', handleNext);
  dotsContainer?.addEventListener('click', handleDotsClick);
  glossaryList?.addEventListener('click', handleGlossaryClick);
  book.addEventListener('click', handleGlossaryClick);
  glossaryDialog?.addEventListener('close', handleGlossaryClose);
  coverGlossaryBtn?.addEventListener('click', handleOpenGlossary);
  pagerGlossaryBtn?.addEventListener('click', handleOpenGlossary);
  coverReadBtn?.addEventListener('click', handleCoverRead);
  siteLogo?.addEventListener('click', handleLogoClick);
  book.addEventListener('click', handleBookClickCapture, true);
  book.addEventListener('dragstart', handleBookDragStart);
  book.addEventListener('pointerdown', handlePointerDown);
  book.addEventListener('pointermove', handlePointerMove);
  book.addEventListener('pointerup', handlePointerUp);
  book.addEventListener('pointercancel', handlePointerCancel);
  document.addEventListener('click', handleDocumentLinkClick);
  document.addEventListener('keydown', handleKeyDown);

  refresh();

  return {
    getPages: collectPages,
    getCurrentIndex: () => currentIndex,
    goToPage,
    goToPageById,
    nextPage,
    prevPage,
    openGlossary,
    refresh,
    destroy: () => {
      clearTimeout(flipTimer);
      clearTimeout(suppressClickTimer);
      clearCurlVisuals();
      spreadMql?.removeEventListener?.('change', handleViewportChange);
      prevBtn?.removeEventListener('click', handlePrev);
      nextBtn?.removeEventListener('click', handleNext);
      dotsContainer?.removeEventListener('click', handleDotsClick);
      glossaryList?.removeEventListener('click', handleGlossaryClick);
      book.removeEventListener('click', handleGlossaryClick);
      glossaryDialog?.removeEventListener('close', handleGlossaryClose);
      coverGlossaryBtn?.removeEventListener('click', handleOpenGlossary);
      pagerGlossaryBtn?.removeEventListener('click', handleOpenGlossary);
      coverReadBtn?.removeEventListener('click', handleCoverRead);
      siteLogo?.removeEventListener('click', handleLogoClick);
      book.removeEventListener('click', handleBookClickCapture, true);
      book.removeEventListener('dragstart', handleBookDragStart);
      book.removeEventListener('pointerdown', handlePointerDown);
      book.removeEventListener('pointermove', handlePointerMove);
      book.removeEventListener('pointerup', handlePointerUp);
      book.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('click', handleDocumentLinkClick);
      document.removeEventListener('keydown', handleKeyDown);
    },
  };
}
