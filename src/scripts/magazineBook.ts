import {
  balanceGlossarySpreads,
  paginateBookToCoverHeight,
  restorePaginatedFlow,
  syncCoverPageHeight,
} from './magazinePaginator';

export interface MagazinePageMeta {
  index: number;
  id: string;
  chapter: string;
  topic: string;
  folio: string;
  title: string;
  description: string;
  element: HTMLElement;
}

export interface TopicGroup {
  chapter: string;
  topic: string;
  description: string;
  startIndex: number;
  endIndex: number;
  rangeLabel: string;
  pages: MagazinePageMeta[];
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

const DOUBLE_SPREAD_QUERY = '(min-width: 37.5rem) and (min-height: 28rem), (min-width: 56rem)';

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
  entries: TopicGroup[];
}

function formatTopicRangeLabel(startIndex: number, endIndex: number): string {
  if (startIndex === 0 && endIndex === 0) return 'COVER';
  if (startIndex === endIndex) return `PAGE ${String(startIndex).padStart(2, '0')}`;
  return `PAGES ${String(startIndex).padStart(2, '0')}–${String(endIndex).padStart(2, '0')}`;
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
    const existing = group.entries.find((entry) => entry.topic === page.topic);
    if (existing) {
      existing.endIndex = Math.max(existing.endIndex, page.index);
      existing.rangeLabel = formatTopicRangeLabel(existing.startIndex, existing.endIndex);
      existing.pages.push(page);
    } else {
      group.entries.push({
        chapter: page.chapter,
        topic: page.topic,
        description: page.description,
        startIndex: page.index,
        endIndex: page.index,
        rangeLabel: formatTopicRangeLabel(page.index, page.index),
        pages: [page],
      });
    }
  }
  return groups;
}

function createGlossaryEntryNode(
  entry: TopicGroup,
  visibleIndices: readonly number[],
  compact = false,
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'glossary-item';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = compact ? 'glossary-entry-btn is-compact' : 'glossary-entry-btn';
  btn.dataset.glossaryIndex = String(entry.startIndex);
  btn.dataset.glossaryEndIndex = String(entry.endIndex);
  if (visibleIndices.some((idx) => idx >= entry.startIndex && idx <= entry.endIndex)) {
    btn.setAttribute('aria-current', 'page');
  }

  const top = document.createElement('div');
  top.className = 'glossary-entry-top';

  const folio = document.createElement('span');
  folio.className = 'glossary-folio';
  folio.textContent = entry.rangeLabel;

  const title = document.createElement('strong');
  title.className = 'glossary-entry-title';
  title.textContent = entry.topic;

  top.append(folio, title);

  const desc = document.createElement('p');
  desc.className = 'glossary-entry-desc';
  desc.textContent = entry.description;

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
      ...group.entries.map((entry) => createGlossaryEntryNode(entry, visibleIndices, compact)),
    );

    li.append(heading, list);
    return li;
  });
}

interface DoubleFlipRig {
  mode: 'double';
  direction: 'forward' | 'backward';
  fromAnchor: number;
  toAnchor: number;
  staticLeft: HTMLElement | null;
  staticRight: HTMLElement | null;
  flipFront: HTMLElement | null;
  flipBack: HTMLElement | null;
}

interface SingleCurlRig {
  mode: 'single';
  direction: 'forward' | 'backward';
  topEl: HTMLElement;
  underEl: HTMLElement;
}

type ActiveTurnRig = DoubleFlipRig | SingleCurlRig;

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
  let activeSkipToken = 0;
  let suppressNextClick = false;
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelSkipCascade = () => {
    activeSkipToken += 1;
  };

  const clearSuppressClick = () => {
    suppressNextClick = false;
    clearTimeout(suppressClickTimer);
  };

  const armSuppressNextClick = () => {
    suppressNextClick = true;
    clearTimeout(suppressClickTimer);
    suppressClickTimer = setTimeout(() => {
      suppressNextClick = false;
    }, 60);
  };

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
    rig: ActiveTurnRig | null;
    pages: MagazinePageMeta[];
  }

  let curlSession: CurlSession | null = null;

  const preloadAdjacentImages = (pages: readonly MagazinePageMeta[], centerIdx: number) => {
    const start = Math.max(0, centerIdx - 2);
    const end = Math.min(pages.length - 1, centerIdx + 4);
    for (let i = start; i <= end; i++) {
      pages[i]?.element.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        img.loading = 'eager';
        img.decoding = 'sync';
        img.decode?.().catch(() => {});
      });
    }
  };

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
      const topic =
        el.dataset.magTopic || (index === 0 ? 'Cover & Masthead' : dynamicTitle);
      const dynamicDesc =
        (id === 'cover'
          ? el.dataset.magDesc
          : el.querySelector<HTMLElement>('.section-subtitle')?.textContent?.trim()) ||
        el.dataset.magDesc ||
        'Editorial feature inside Main Character Media.';
      const topicDesc = el.dataset.magTopicDesc || dynamicDesc;
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
        topic,
        folio,
        title: dynamicTitle,
        description: topicDesc,
        element: el,
      };
    });
  };

  const renderGlossary = (
    pages: MagazinePageMeta[],
    visibleIndices: readonly number[],
    splitRatio = 0.45,
  ) => {
    const groups = groupPagesByChapter(pages);

    if (glossaryList) {
      glossaryList.replaceChildren(...renderChapterGroupNodes(groups, visibleIndices, false));
    }

    if (glossarySpreadLeft && glossarySpreadRight) {
      const totalTopics = groups.reduce((acc, g) => acc + g.entries.length, 0);
      const leftGroups: ChapterGroup[] = [];
      const rightGroups: ChapterGroup[] = [];
      let countSoFar = 0;

      for (const grp of groups) {
        if (leftGroups.length === 0 || countSoFar < Math.floor(totalTopics * splitRatio)) {
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

    renderGlossary(pages, visibleIndices, glossarySplitRatio);
  };

  let glossarySplitRatio = 0.45;
  let isRepaginating = false;
  let lastLayoutSignature = '';

  interface ReadingAnchor {
    pageIndex: number;
    pageId: string;
    baseId: string;
    chapter: string;
    topic: string;
    caseId?: string;
    itemText?: string;
  }

  const captureReadingAnchor = (pages: readonly MagazinePageMeta[]): ReadingAnchor => {
    const active = pages[currentIndex] ?? pages[0];
    const el = active?.element;
    const baseId = el?.dataset.magContinuationOf || active?.id || 'cover';
    const caseId = el?.querySelector<HTMLElement>('.case-card[data-case-id]:not([hidden])')?.dataset
      .caseId;
    const itemEl = el?.querySelector<HTMLElement>(
      '.event-card, .service-card, .faq-item, .custom-text-card, .custom-ref-card, .mag-zine-copy',
    );
    return {
      pageIndex: currentIndex,
      pageId: active?.id || 'cover',
      baseId,
      chapter: active?.chapter || 'Front Matter',
      topic: active?.topic || 'Cover & Masthead',
      caseId,
      itemText: itemEl?.textContent?.trim().slice(0, 64),
    };
  };

  const resolveAnchorIndex = (
    pages: readonly MagazinePageMeta[],
    anchor: ReadingAnchor,
  ): number => {
    if (pages.length === 0) return 0;
    if (anchor.caseId) {
      const cardMatch = pages.findIndex(
        (p) =>
          p.element.querySelector(
            `.case-card[data-case-id="${anchor.caseId}"]:not([hidden])`,
          ) !== null,
      );
      if (cardMatch >= 0) return cardMatch;
    }
    const exactMatch = pages.findIndex((p) => p.id === anchor.pageId);
    if (exactMatch >= 0) return exactMatch;

    if (anchor.itemText) {
      const itemMatch = pages.findIndex((p) => {
        const els = p.element.querySelectorAll<HTMLElement>(
          '.event-card, .service-card, .faq-item, .custom-text-card, .custom-ref-card, .mag-zine-copy',
        );
        return Array.from(els).some(
          (el) => el.textContent?.trim().slice(0, 64) === anchor.itemText,
        );
      });
      if (itemMatch >= 0) return itemMatch;
    }

    const baseMatch = pages.findIndex(
      (p) =>
        p.id === anchor.baseId ||
        p.element.dataset.magContinuationOf === anchor.baseId ||
        (p.chapter === anchor.chapter && p.topic === anchor.topic),
    );
    if (baseMatch >= 0) return baseMatch;

    return Math.min(anchor.pageIndex, pages.length - 1);
  };

  const syncChromeHeights = () => {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const header = root.querySelector<HTMLElement>('.site-header');
    const pager = root.querySelector<HTMLElement>('.mag-pager');
    const docStyle = document.documentElement.style;
    const headerH = header?.getBoundingClientRect?.().height ?? 0;
    const pagerH = pager?.getBoundingClientRect?.().height ?? 0;
    if (headerH > 0) docStyle.setProperty('--mag-header-actual', `${Math.ceil(headerH)}px`);
    if (pagerH > 0) docStyle.setProperty('--mag-pager-actual', `${Math.ceil(pagerH)}px`);
  };

  const getLayoutSignature = (): string => {
    const header = root.querySelector<HTMLElement>('.site-header');
    const pager = root.querySelector<HTMLElement>('.mag-pager');
    const stage = book.closest<HTMLElement>('.mag-stage') ?? book;
    const stageRect = stage.getBoundingClientRect?.();
    const headerH = Math.ceil(header?.getBoundingClientRect?.().height ?? 0);
    const pagerH = Math.ceil(pager?.getBoundingClientRect?.().height ?? 0);
    const doubleSpread = isDoubleSpreadViewport() ? '2' : '1';
    return `${Math.round(stageRect?.width ?? 0)}x${Math.round(stageRect?.height ?? 0)}:${headerH}x${pagerH}:${doubleSpread}`;
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
      // Cover keeps identical 50% right-sheet geometry before/during opening so its size never jumps
      p.element.classList.toggle('is-left-sheet', doubleSpread && !isCover && i === visible[0]);
      p.element.classList.toggle(
        'is-right-sheet',
        doubleSpread && ((isCover && i === 0) || (!isCover && visible.length > 1 && i === visible[1])),
      );
    });

    currentIndex = anchor;
    renderPager(pages, visible);
    preloadAdjacentImages(pages, anchor);
    syncChromeHeights();
    syncCoverPageHeight(book);
  };

  const reflowMagazinePages = (preservePosition = true) => {
    if (isRepaginating) return;
    isRepaginating = true;
    try {
      cancelSkipCascade();
      flushPendingSettle();
      const pagesBefore = collectPages();
      const anchor = captureReadingAnchor(pagesBefore);

      syncChromeHeights();
      const doubleSpread = isDoubleSpreadViewport();
      book.classList.toggle('is-double-spread', doubleSpread);

      const coverHeight = paginateBookToCoverHeight(book);
      const nextPages = collectPages();
      const resolved = preservePosition
        ? resolveAnchorIndex(nextPages, anchor)
        : Math.min(currentIndex, Math.max(0, nextPages.length - 1));

      applyActivePageDom(nextPages, resolved);

      if (coverHeight > 0) {
        const visibleNow = getVisibleIndicesForAnchor(currentIndex, nextPages.length, doubleSpread);
        balanceGlossarySpreads(book, coverHeight, (ratio) => {
          glossarySplitRatio = ratio;
          renderGlossary(nextPages, visibleNow, ratio);
        });
      }

      lastLayoutSignature = getLayoutSignature();
    } finally {
      isRepaginating = false;
    }
  };

  const clearCurlVisuals = () => {
    if (settleRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(settleRafId);
      settleRafId = 0;
    }
    pendingSettleFinish = null;
    book.classList.remove('is-curling', 'is-curling-forward', 'is-curling-backward');
    book.style.removeProperty('--curl-p');
    book.style.removeProperty('transform');
    if (curlFlapHost) {
      curlFlapHost.classList.remove('is-visible');
    }
    if (curlFlap) {
      curlFlap.style.removeProperty('clip-path');
      curlFlap.style.removeProperty('opacity');
    }
    book.querySelectorAll<HTMLElement>('[data-mag-page]').forEach((el) => {
      el.classList.remove(
        'is-curl-top',
        'is-curl-underneath',
        'is-static-left',
        'is-static-right',
        'is-flip-leaf-right',
        'is-flip-leaf-left',
      );
      el.style.removeProperty('clip-path');
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
      el.style.removeProperty('visibility');
      el.style.removeProperty('z-index');
    });
  };

  const flushPendingSettle = () => {
    if (!pendingSettleFinish) {
      clearCurlVisuals();
      return;
    }
    const finish = pendingSettleFinish;
    pendingSettleFinish = null;
    finish();
  };

  const setupTurnRig = (
    pages: MagazinePageMeta[],
    fromAnchor: number,
    toAnchor: number,
    direction: 'forward' | 'backward',
    doubleSpread: boolean,
  ): ActiveTurnRig | null => {
    if (!doubleSpread) {
      const curEl = pages[fromAnchor]?.element;
      const destEl = pages[toAnchor]?.element;
      if (!curEl || !destEl) return null;

      const topEl = direction === 'forward' ? curEl : destEl;
      const underEl = direction === 'forward' ? destEl : curEl;
      curEl.hidden = false;
      destEl.hidden = false;
      topEl.classList.add('is-curl-top');
      underEl.classList.add('is-curl-underneath');

      book.classList.add(
        'is-curling',
        direction === 'forward' ? 'is-curling-forward' : 'is-curling-backward',
      );
      return { mode: 'single', direction, topEl, underEl };
    }

    const fromIndices = getVisibleIndicesForAnchor(fromAnchor, pages.length, true);
    const toIndices = getVisibleIndicesForAnchor(toAnchor, pages.length, true);

    const fromLeftEl = fromAnchor > 0 ? pages[fromIndices[0]]?.element ?? null : null;
    const fromRightEl =
      fromAnchor === 0 ? pages[0]?.element ?? null : pages[fromIndices[1]]?.element ?? null;
    const toLeftEl = toAnchor > 0 ? pages[toIndices[0]]?.element ?? null : null;
    const toRightEl =
      toAnchor === 0 ? pages[0]?.element ?? null : pages[toIndices[1]]?.element ?? null;

    // Strip grid-column classes from all pages during curling so position:absolute percentages resolve
    // against full #mag-book (50% = spine) instead of column-2's shifted containing block.
    pages.forEach((p) => {
      p.element.classList.remove('is-left-sheet', 'is-right-sheet');
    });

    // Reveal every participating sheet immediately so next pages render live underneath before turn crosses spine
    [fromLeftEl, fromRightEl, toLeftEl, toRightEl].forEach((el) => {
      if (el) el.hidden = false;
    });

    if (direction === 'forward') {
      // Right sheet flips over spine (0 -> -180deg) onto Left; nextLeft is its verso & nextRight is pre-rendered underneath!
      fromLeftEl?.classList.add('is-static-left');
      toRightEl?.classList.add('is-static-right');
      fromRightEl?.classList.add('is-flip-leaf-right');
      toLeftEl?.classList.add('is-flip-leaf-left');

      book.classList.remove('is-cover-spread-active');
      book.classList.add('is-curling', 'is-curling-forward');

      return {
        mode: 'double',
        direction,
        fromAnchor,
        toAnchor,
        staticLeft: fromLeftEl,
        staticRight: toRightEl,
        flipFront: fromRightEl,
        flipBack: toLeftEl,
      };
    }

    // Backward turn: Left sheet flips back over spine (0 -> +180deg) to Right; prevRight is its verso & prevLeft sits underneath
    toLeftEl?.classList.add('is-static-left');
    fromRightEl?.classList.add('is-static-right');
    fromLeftEl?.classList.add('is-flip-leaf-left');
    toRightEl?.classList.add('is-flip-leaf-right');

    book.classList.remove('is-cover-spread-active');
    book.classList.add('is-curling', 'is-curling-backward');

    return {
      mode: 'double',
      direction,
      fromAnchor,
      toAnchor,
      staticLeft: toLeftEl,
      staticRight: fromRightEl,
      flipFront: fromLeftEl,
      flipBack: toRightEl,
    };
  };

  const applyRigProgress = (rig: ActiveTurnRig, rawProgress: number, touchYRatio = 0.78) => {
    const p = clamp(rawProgress, 0, 1);
    book.style.setProperty('--curl-p', p.toFixed(4));

    if (rig.mode === 'single') {
      if (prefersReducedMotion()) {
        rig.topEl.style.opacity = rig.direction === 'forward' ? String(clamp(1 - p, 0, 1)) : String(p);
        rig.underEl.style.opacity = '1';
        return;
      }

      const curlRatio = rig.direction === 'forward' ? p : 1 - p;
      const peelArc = Math.sin(curlRatio * Math.PI);
      const bias = (touchYRatio - 0.5) * 38 * peelArc;
      const creaseTop = clamp(100 - curlRatio * 124 + bias, -30, 100);
      const creaseBot = clamp(100 - curlRatio * 124 - bias, -30, 100);

      rig.topEl.style.clipPath = `polygon(0% 0%, ${creaseTop.toFixed(2)}% 0%, ${creaseBot.toFixed(2)}% 100%, 0% 100%)`;
      rig.topEl.style.opacity = '1';

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
      rig.underEl.style.filter = `brightness(${underBrightness.toFixed(3)})`;
      rig.underEl.style.opacity = '1';
      return;
    }

    // Physical Double-Spread 3D Leaf Turn (50% sheet geometry preserved throughout!)
    if (rig.fromAnchor === 0 && rig.direction === 'forward') {
      book.style.transform = `translateX(${(-25 * (1 - p)).toFixed(3)}%)`;
    } else if (rig.toAnchor === 0 && rig.direction === 'backward') {
      book.style.transform = `translateX(${(-25 * p).toFixed(3)}%)`;
    } else {
      book.style.transform = 'translateX(0%)';
    }

    const frontVisible = p < 0.5;
    const frontAngle = rig.direction === 'forward' ? -180 * p : 180 * p;
    const backAngle = rig.direction === 'forward' ? 180 * (1 - p) : -180 * (1 - p);

    if (rig.flipFront) {
      rig.flipFront.style.transform = `rotateY(${frontAngle.toFixed(2)}deg)`;
      rig.flipFront.style.visibility = frontVisible ? 'visible' : 'hidden';
      rig.flipFront.style.zIndex = frontVisible ? '5' : '1';
      rig.flipFront.style.filter = `brightness(${(1 - p * 0.14).toFixed(3)})`;
    }
    if (rig.flipBack) {
      rig.flipBack.style.transform = `rotateY(${backAngle.toFixed(2)}deg)`;
      rig.flipBack.style.visibility = !frontVisible ? 'visible' : 'hidden';
      rig.flipBack.style.zIndex = !frontVisible ? '5' : '1';
      rig.flipBack.style.filter = `brightness(${(0.88 + p * 0.12).toFixed(3)})`;
    }
    if (rig.staticLeft) {
      rig.staticLeft.style.zIndex = '1';
      rig.staticLeft.style.visibility = 'visible';
    }
    if (rig.staticRight) {
      rig.staticRight.style.zIndex = '1';
      rig.staticRight.style.visibility = 'visible';
    }
  };

  const focusPageHeading = (el: HTMLElement | undefined) => {
    const heading = el?.querySelector<HTMLElement>('h1, h2');
    heading?.focus?.({ preventScroll: true });
  };

  const finalizeTurnSettle = (
    pages: MagazinePageMeta[],
    rig: ActiveTurnRig,
    startP: number,
    endP: number,
    commitIndex: number | null,
    touchYRatio = 0.78,
    duration = 160,
    skipFocus = false,
    onSettled?: () => void,
  ) => {
    const finish = () => {
      clearCurlVisuals();
      if (commitIndex !== null) {
        applyActivePageDom(pages, commitIndex);
        if (!skipFocus) {
          if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
          focusPageHeading(pages[commitIndex]?.element);
        }
      } else {
        applyActivePageDom(pages, currentIndex);
      }
      onSettled?.();
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
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const step = (now: number) => {
      if (pendingSettleFinish !== finish) return;
      const elapsed = Math.min(1, Math.max(0, (now - startTime) / duration));
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const currentP = startP + (endP - startP) * eased;
      applyRigProgress(rig, currentP, touchYRatio);
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
    cancelSkipCascade();
    flushPendingSettle();
    const pages = collectPages();
    if (pages.length === 0) return;

    const doubleSpread = isDoubleSpreadViewport();
    const anchor = snapToSpreadAnchor(targetIndex, pages.length, doubleSpread);
    if (anchor === currentIndex && pages[anchor]?.element.classList.contains('is-active-page')) {
      return;
    }

    const direction: 'forward' | 'backward' = anchor >= currentIndex ? 'forward' : 'backward';
    const steps: number[] = [];
    let cursor = currentIndex;
    while (cursor !== anchor && steps.length < pages.length) {
      const nextStep = getAdjacentAnchor(cursor, direction, pages.length, doubleSpread);
      if (nextStep === null || nextStep === cursor) break;
      steps.push(nextStep);
      cursor = nextStep;
    }
    if (steps.length === 0 || steps[steps.length - 1] !== anchor) {
      if (steps.length === 0) steps.push(anchor);
      else steps[steps.length - 1] = anchor;
    }

    const scopedBook = book as HTMLElement & {
      startViewTransition?: (opts: { update: () => void; types?: string[] } | (() => void)) => {
        ready?: Promise<void>;
        finished?: Promise<void>;
      };
    };

    const updateDomTo = (destIndex: number) => {
      applyActivePageDom(pages, destIndex);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
      focusPageHeading(pages[destIndex]?.element);
    };

    if (steps.length === 1) {
      if (doubleSpread && !prefersReducedMotion() && typeof requestAnimationFrame === 'function') {
        const rig = setupTurnRig(pages, currentIndex, anchor, direction, true);
        if (rig) {
          applyRigProgress(rig, 0, 0.5);
          finalizeTurnSettle(pages, rig, 0, 1, anchor, 0.5, 300);
          return;
        }
      }

      if (!prefersReducedMotion() && typeof scopedBook.startViewTransition === 'function') {
        try {
          const transition = scopedBook.startViewTransition({
            update: () => updateDomTo(anchor),
            types: [direction],
          });
          transition?.ready?.catch?.(() => {});
        } catch {
          updateDomTo(anchor);
          triggerFallbackFlip(direction);
        }
      } else {
        updateDomTo(anchor);
        triggerFallbackFlip(direction);
      }
      return;
    }

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      updateDomTo(anchor);
      triggerFallbackFlip(direction);
      return;
    }

    const cascadeToken = ++activeSkipToken;
    const stepDuration = clamp(Math.round(560 / steps.length), 65, 165);

    const runStep = (stepIdx: number) => {
      if (cascadeToken !== activeSkipToken) return;
      const destIndex = steps[stepIdx];
      if (destIndex === undefined) {
        activeSkipToken = 0;
        return;
      }
      const isLast = stepIdx === steps.length - 1;
      const stepDir: 'forward' | 'backward' = destIndex >= currentIndex ? 'forward' : 'backward';
      const rig = setupTurnRig(pages, currentIndex, destIndex, stepDir, doubleSpread);
      if (!rig) {
        applyActivePageDom(pages, destIndex);
        if (!isLast) {
          runStep(stepIdx + 1);
        } else {
          focusPageHeading(pages[destIndex]?.element);
          activeSkipToken = 0;
        }
        return;
      }

      applyRigProgress(rig, 0, 0.5);
      finalizeTurnSettle(
        pages,
        rig,
        0,
        1,
        destIndex,
        0.5,
        stepDuration,
        !isLast,
        () => {
          if (cascadeToken !== activeSkipToken) return;
          if (!isLast) {
            runStep(stepIdx + 1);
          } else {
            activeSkipToken = 0;
          }
        },
      );
    };

    runStep(0);
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
    clearSuppressClick();
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
    clearSuppressClick();
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
    renderGlossary(pages, visible, glossarySplitRatio);
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
    reflowMagazinePages(true);
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

    clearSuppressClick();
    cancelSkipCascade();
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
      rig: null,
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

      const rig = setupTurnRig(
        curlSession.pages,
        currentIndex,
        targetIndex,
        direction,
        curlSession.doubleSpread,
      );
      if (!rig) {
        curlSession = null;
        return;
      }

      curlSession.locked = 'horizontal';
      curlSession.direction = direction;
      curlSession.targetIndex = targetIndex;
      curlSession.rig = rig;
      book.setPointerCapture?.(e.pointerId);
    }

    if (curlSession.locked === 'horizontal' && curlSession.direction && curlSession.rig) {
      const rect = book.getBoundingClientRect();
      const bookWidth = Math.max(280, rect.width || 390);
      if (rect.height > 0) {
        curlSession.touchYRatio = clamp((e.clientY - rect.top) / rect.height, 0.12, 0.88);
      }
      const directionalDelta = curlSession.direction === 'forward' ? -dx : dx;
      const dragSpan = curlSession.doubleSpread ? bookWidth * 0.45 : bookWidth * 0.7;
      const progress = clamp(directionalDelta / dragSpan, 0, 1);
      curlSession.progress = progress;
      applyRigProgress(curlSession.rig, progress, curlSession.touchYRatio);
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
      if (Math.hypot(dx, dy) >= 8) {
        armSuppressNextClick();
      }
      if (Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        const direction: 'forward' | 'backward' = dx < 0 ? 'forward' : 'backward';
        const targetIndex = getAdjacentAnchor(
          currentIndex,
          direction,
          session.pages.length,
          session.doubleSpread,
        );
        if (targetIndex !== null) {
          goToPage(targetIndex);
        }
      }
      return;
    }

    if (session.locked !== 'horizontal' || !session.direction || !session.rig) {
      return;
    }

    armSuppressNextClick();

    const directionalVelocity = (session.direction === 'forward' ? -dx : dx) / dt;
    const shouldCommit = !forceCancel
      ? session.progress >= 0.24 || directionalVelocity >= 0.35
      : session.progress >= 0.35;

    finalizeTurnSettle(
      session.pages,
      session.rig,
      session.progress,
      shouldCommit ? 1 : 0,
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
    reflowMagazinePages(true);
  };
  const handleViewportResizeCheck = () => {
    if (isRepaginating) return;
    const sig = getLayoutSignature();
    if (sig !== lastLayoutSignature) {
      reflowMagazinePages(true);
    }
  };
  const handleBeforeContentUpdate = () => {
    cancelSkipCascade();
    flushPendingSettle();
    restorePaginatedFlow(book);
  };
  const handleContentUpdated = () => {
    reflowMagazinePages(true);
  };
  const chromeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          handleViewportResizeCheck();
        })
      : null;
  const headerChrome = root.querySelector<HTMLElement>('.site-header');
  const pagerChrome = root.querySelector<HTMLElement>('.mag-pager');
  if (chromeObserver) {
    if (headerChrome) chromeObserver.observe(headerChrome);
    if (pagerChrome) chromeObserver.observe(pagerChrome);
    chromeObserver.observe(book);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener?.('resize', handleViewportChange);
  }
  spreadMql?.addEventListener?.('change', handleViewportChange);

  prevBtn?.addEventListener('click', handlePrev);
  nextBtn?.addEventListener('click', handleNext);
  dotsContainer?.addEventListener('click', handleDotsClick);
  glossaryList?.addEventListener('click', handleGlossaryClick);
  book.addEventListener('click', handleGlossaryClick);
  book.addEventListener('mcm:before-content-update', handleBeforeContentUpdate);
  book.addEventListener('mcm:content-updated', handleContentUpdated);
  book.addEventListener('load', handleContentUpdated, true);
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
      cancelSkipCascade();
      clearTimeout(flipTimer);
      clearTimeout(suppressClickTimer);
      clearCurlVisuals();
      chromeObserver?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener?.('resize', handleViewportChange);
      }
      spreadMql?.removeEventListener?.('change', handleViewportChange);
      prevBtn?.removeEventListener('click', handlePrev);
      nextBtn?.removeEventListener('click', handleNext);
      dotsContainer?.removeEventListener('click', handleDotsClick);
      glossaryList?.removeEventListener('click', handleGlossaryClick);
      book.removeEventListener('click', handleGlossaryClick);
      book.removeEventListener('mcm:before-content-update', handleBeforeContentUpdate);
      book.removeEventListener('mcm:content-updated', handleContentUpdated);
      book.removeEventListener('load', handleContentUpdated, true);
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
