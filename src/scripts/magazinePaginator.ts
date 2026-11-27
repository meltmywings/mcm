interface MovedFlowItem {
  container: HTMLElement;
  node: HTMLElement;
  addedFormAttr?: boolean;
}

interface PaginatorBookState {
  movedItems: MovedFlowItem[];
}

const bookStates = new WeakMap<HTMLElement, PaginatorBookState>();

const MAX_CONTINUATION_PAGES = 10;

const SPLITTABLE_SELECTORS = [
  '.mag-page-extra-texts',
  '.work-grid',
  '.events-grid',
  '.services-grid',
  '.faq-list',
  '.custom-elements-grid',
  '.metrics-grid',
  '.process-grid',
  '.footer-grid',
  '.brief-form',
];

function getOrCreateState(book: HTMLElement): PaginatorBookState {
  let state = bookStates.get(book);
  if (!state) {
    state = { movedItems: [] };
    bookStates.set(book, state);
  }
  return state;
}

export function restorePaginatedFlow(book: HTMLElement): void {
  const state = bookStates.get(book);
  if (state) {
    for (const record of state.movedItems) {
      if (record.addedFormAttr) {
        record.node
          .querySelectorAll<HTMLElement>('input, select, textarea, button')
          .forEach((ctrl) => {
            if (ctrl.dataset.magFormLinked === 'true') {
              ctrl.removeAttribute('form');
              delete ctrl.dataset.magFormLinked;
            }
          });
      }
      if (record.container.isConnected) {
        record.container.appendChild(record.node);
      }
    }
    state.movedItems = [];
  }

  book.querySelectorAll<HTMLElement>('[data-mag-continued="true"]').forEach((el) => {
    el.remove();
  });
}

export function syncCoverPageHeight(book: HTMLElement): number {
  const cover = book.querySelector<HTMLElement>('#cover');
  if (!cover) return 0;

  book.style.removeProperty('--mag-page-h');
  const stage = book.closest<HTMLElement>('.mag-stage');
  stage?.style.removeProperty('--mag-page-h');

  const wasHidden = cover.hidden;
  cover.hidden = false;
  cover.dataset.magMeasuring = 'true';
  book.classList.add('is-paginating');

  const rectHeight = cover.getBoundingClientRect?.().height ?? 0;
  const rawHeight = rectHeight > 0 ? rectHeight : cover.clientHeight;
  const measured = Math.floor(rawHeight);

  delete cover.dataset.magMeasuring;
  book.classList.remove('is-paginating');
  cover.hidden = wasHidden;

  if (measured > 0) {
    book.style.setProperty('--mag-page-h', `${measured}px`);
    stage?.style.setProperty('--mag-page-h', `${measured}px`);
  }

  return measured;
}

function pageOverflowsHeight(pageEl: HTMLElement, targetHeight: number): boolean {
  if (targetHeight <= 0) return false;
  const canvas = pageEl.querySelector<HTMLElement>('.mag-spread-canvas') ?? pageEl;
  const canvasClient = canvas.clientHeight > 0 ? canvas.clientHeight : targetHeight;
  const maxAllowed = Math.min(targetHeight, canvasClient);
  return pageEl.scrollHeight > targetHeight + 2 || canvas.scrollHeight > maxAllowed + 2;
}

function findSplittableSource(pageEl: HTMLElement): HTMLElement | null {
  for (const selector of SPLITTABLE_SELECTORS) {
    const candidates = Array.from(pageEl.querySelectorAll<HTMLElement>(selector));
    for (let i = candidates.length - 1; i >= 0; i--) {
      const candidate = candidates[i];
      const children = Array.from(candidate.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && !child.hidden,
      );
      if (children.length > 1 || (selector === '.brief-form' && children.length >= 1)) {
        return candidate;
      }
    }
  }

  const leftStage = pageEl.querySelector<HTMLElement>('.mag-ref-left-stage');
  if (leftStage) {
    const proseCopies = Array.from(leftStage.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        !child.hidden &&
        (child.classList.contains('mag-zine-copy') || child.classList.contains('quote-block')),
    );
    if (proseCopies.length > 1) {
      return leftStage;
    }
  }

  const rightCol = pageEl.querySelector<HTMLElement>('.mag-ref-right-col');
  if (rightCol) {
    const cards = Array.from(rightCol.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        !child.hidden &&
        !child.classList.contains('mag-ref-mini-trio'),
    );
    if (cards.length > 0) {
      return rightCol;
    }
  }

  return null;
}

function getMovableChildren(source: HTMLElement): HTMLElement[] {
  if (source.classList.contains('mag-ref-left-stage')) {
    return Array.from(source.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        !child.hidden &&
        (child.classList.contains('mag-zine-copy') || child.classList.contains('quote-block')),
    );
  }
  if (source.classList.contains('mag-ref-right-col')) {
    return Array.from(source.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        !child.hidden &&
        !child.classList.contains('mag-ref-mini-trio'),
    );
  }
  return Array.from(source.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hidden,
  );
}

function createDestinationContainerForSource(source: HTMLElement): HTMLElement {
  if (source.classList.contains('brief-form')) {
    const div = document.createElement('div');
    div.className = 'brief-form brief-form-cont';
    return div;
  }
  const cloneTag = source.tagName.toLowerCase();
  const dest = document.createElement(cloneTag === 'ul' || cloneTag === 'ol' ? cloneTag : 'div');
  dest.className = source.className;
  return dest;
}

function createContinuationArticle(basePage: HTMLElement, contIndex: number): HTMLElement {
  const baseId = basePage.dataset.magContinuationOf || basePage.dataset.magPage || basePage.id || 'page';
  const baseTitle = basePage.dataset.magTitle || 'Feature';
  const baseTopic = basePage.dataset.magTopic || baseTitle;
  const tagText =
    basePage.querySelector<HTMLElement>('.mag-folio-tag')?.textContent?.trim() || 'CONTINUED';

  const article = document.createElement('article');
  article.className = 'mag-page mag-spread is-zine-page no-photos';
  article.hidden = true;
  article.dataset.magContinued = 'true';
  article.dataset.magContinuationOf = baseId;
  article.dataset.magPage = `${baseId}--c${contIndex}`;
  article.dataset.magChapter = basePage.dataset.magChapter || 'Special Features';
  article.dataset.magTopic = baseTopic;
  article.dataset.magTopicDesc = basePage.dataset.magTopicDesc || basePage.dataset.magDesc || '';
  article.dataset.magTitle = baseTitle;
  article.dataset.magDesc = basePage.dataset.magDesc || '';
  if (basePage.dataset.section) {
    article.dataset.section = basePage.dataset.section;
  }
  if (basePage.dataset.sectionHidden) {
    article.dataset.sectionHidden = basePage.dataset.sectionHidden;
  }

  const canvas = document.createElement('div');
  canvas.className = 'mag-spread-canvas mag-zine-canvas';

  const folioBar = document.createElement('div');
  folioBar.className = 'mag-folio-bar';
  const tag = document.createElement('span');
  tag.className = 'mag-folio-tag';
  tag.textContent = tagText.includes('CONT.') ? tagText : `${tagText} · CONT.`;
  const num = document.createElement('span');
  num.className = 'mag-folio-number';
  folioBar.append(tag, num);

  const sheet = document.createElement('div');
  sheet.className = 'mag-ref-sheet';
  const leftStage = document.createElement('div');
  leftStage.className = 'mag-ref-left-stage';
  leftStage.style.gridColumn = '1 / -1';

  const header = document.createElement('header');
  header.className = 'mag-zine-head';
  const kicker = document.createElement('p');
  kicker.className = 'mag-kicker';
  kicker.textContent = `${baseTopic} · Continued`;
  header.append(kicker);
  leftStage.append(header);

  sheet.append(leftStage);

  const oval = document.createElement('span');
  oval.className = 'mag-folio-oval';
  oval.setAttribute('aria-hidden', 'true');

  canvas.append(folioBar, sheet, oval);
  article.append(canvas);
  return article;
}

function linkMovedFormControls(node: HTMLElement, formId: string): boolean {
  let linked = false;
  node.querySelectorAll<HTMLElement>('input, select, textarea, button').forEach((ctrl) => {
    if (!ctrl.hasAttribute('form')) {
      ctrl.setAttribute('form', formId);
      ctrl.dataset.magFormLinked = 'true';
      linked = true;
    }
  });
  return linked;
}

export function paginateBookToCoverHeight(book: HTMLElement): number {
  restorePaginatedFlow(book);

  const targetHeight = syncCoverPageHeight(book);
  if (targetHeight <= 0) {
    return 0;
  }

  const state = getOrCreateState(book);
  const basePages = Array.from(book.querySelectorAll<HTMLElement>('[data-mag-page]')).filter(
    (el) =>
      el.dataset.sectionHidden !== 'true' &&
      el.id !== 'cover' &&
      !el.classList.contains('is-glossary-page'),
  );

  book.classList.add('is-paginating');

  try {
    for (const basePage of basePages) {
      let currentEl: HTMLElement = basePage;
      let contSeq = 1;

      while (contSeq <= MAX_CONTINUATION_PAGES) {
        const wasHidden = currentEl.hidden;
        currentEl.hidden = false;
        currentEl.dataset.magMeasuring = 'true';

        const overflows = pageOverflowsHeight(currentEl, targetHeight);
        if (!overflows) {
          delete currentEl.dataset.magMeasuring;
          currentEl.hidden = wasHidden;
          break;
        }

        const popped: { container: HTMLElement; node: HTMLElement; addedFormAttr: boolean }[] = [];
        let guard = 0;

        while (pageOverflowsHeight(currentEl, targetHeight) && guard < 60) {
          guard += 1;
          const source = findSplittableSource(currentEl);
          if (!source) break;

          const movable = getMovableChildren(source);
          const minKeep = source.classList.contains('mag-ref-right-col') ? 0 : 1;
          if (movable.length <= minKeep) break;

          const lastChild = movable[movable.length - 1];
          const originalContainer =
            state.movedItems.find((item) => item.node === lastChild)?.container ?? source;
          const isFormNode =
            source.id === 'brief-form' || Boolean(lastChild.closest('#brief-form'));
          const addedFormAttr = isFormNode ? linkMovedFormControls(lastChild, 'brief-form') : false;

          lastChild.remove();
          popped.push({
            container: originalContainer,
            node: lastChild,
            addedFormAttr,
          });
        }

        delete currentEl.dataset.magMeasuring;
        currentEl.hidden = wasHidden;

        if (popped.length === 0) {
          break;
        }

        // Restore ascending DOM order for moved items
        const ordered = popped.reverse();
        const contArticle = createContinuationArticle(basePage, contSeq);
        const contStage = contArticle.querySelector<HTMLElement>('.mag-ref-left-stage');

        // Group consecutive moved nodes sharing the same original container type cleanly
        let activeDest: HTMLElement | null = null;
        let activeDestKey = '';

        for (const item of ordered) {
          state.movedItems.push(item);
          const key = item.container.id || item.container.className;
          if (!activeDest || key !== activeDestKey) {
            activeDest = createDestinationContainerForSource(item.container);
            activeDestKey = key;
            contStage?.append(activeDest);
          }
          activeDest.append(item.node);
        }

        currentEl.insertAdjacentElement('afterend', contArticle);
        currentEl = contArticle;
        contSeq += 1;
      }
    }
  } finally {
    book.querySelectorAll<HTMLElement>('[data-mag-measuring="true"]').forEach((el) => {
      delete el.dataset.magMeasuring;
    });
    book.classList.remove('is-paginating');
  }

  return targetHeight;
}

export function balanceGlossarySpreads(
  book: HTMLElement,
  targetHeight: number,
  renderPair: (splitRatio: number) => void,
): void {
  const leftPage = book.querySelector<HTMLElement>('#glossary-1');
  const rightPage = book.querySelector<HTMLElement>('#glossary-2');
  if (!leftPage || !rightPage || targetHeight <= 0) return;

  book.classList.add('is-paginating');
  try {
    let bestRatio = 0.5;
    const candidateRatios = [0.5, 0.42, 0.58, 0.36, 0.64];

    for (const ratio of candidateRatios) {
      renderPair(ratio);
      const leftHidden = leftPage.hidden;
      const rightHidden = rightPage.hidden;
      leftPage.hidden = false;
      rightPage.hidden = false;
      leftPage.dataset.magMeasuring = 'true';
      rightPage.dataset.magMeasuring = 'true';

      const leftFits = !pageOverflowsHeight(leftPage, targetHeight);
      const rightFits = !pageOverflowsHeight(rightPage, targetHeight);

      delete leftPage.dataset.magMeasuring;
      delete rightPage.dataset.magMeasuring;
      leftPage.hidden = leftHidden;
      rightPage.hidden = rightHidden;

      if (leftFits && rightFits) {
        bestRatio = ratio;
        break;
      }
      if (leftFits) {
        bestRatio = ratio;
      }
    }

    renderPair(bestRatio);
  } finally {
    book.querySelectorAll<HTMLElement>('[data-mag-measuring="true"]').forEach((el) => {
      delete el.dataset.magMeasuring;
    });
    book.classList.remove('is-paginating');
  }
}
