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

interface SplittableRule {
  selector: string;
  minKeep: number;
}

const PRIMARY_SPLIT_RULES: SplittableRule[] = [
  { selector: '.mag-page-extra-texts', minKeep: 0 },
  { selector: '.work-grid', minKeep: 1 },
  { selector: '.events-grid', minKeep: 1 },
  { selector: '.services-grid', minKeep: 1 },
  { selector: '.faq-list', minKeep: 1 },
  { selector: '.custom-elements-grid', minKeep: 1 },
  { selector: '.metrics-grid', minKeep: 1 },
  { selector: '.process-grid', minKeep: 1 },
  { selector: '.footer-grid', minKeep: 1 },
  { selector: '.mag-ref-photos', minKeep: 0 },
  { selector: '.brief-form', minKeep: 1 },
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
        if (record.container.classList.contains('mag-ref-left-stage')) {
          const extra = record.container.querySelector(':scope > .mag-page-extra-texts');
          if (extra) {
            record.container.insertBefore(record.node, extra);
            continue;
          }
        }
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

  const visibleOthers = Array.from(book.querySelectorAll<HTMLElement>('[data-mag-page]')).filter(
    (el) => el !== cover && !el.hidden,
  );
  visibleOthers.forEach((el) => {
    el.hidden = true;
  });

  const wasCoverHidden = cover.hidden;
  cover.hidden = false;
  cover.dataset.magMeasuring = 'true';
  book.classList.add('is-paginating');

  const rectHeight = cover.getBoundingClientRect?.().height ?? 0;
  const rawHeight = rectHeight > 0 ? rectHeight : cover.clientHeight;
  let measured = Math.floor(rawHeight);

  if (stage && typeof getComputedStyle === 'function') {
    const stageRect = stage.getBoundingClientRect?.();
    if (stageRect && stageRect.height > 0) {
      const stStyle = getComputedStyle(stage);
      const padTop = parseFloat(stStyle.paddingTop || '0') || 0;
      const padBottom = parseFloat(stStyle.paddingBottom || '0') || 0;
      const stageInner = Math.floor(stageRect.height - padTop - padBottom);
      if (stageInner > 100 && (measured <= 0 || measured > stageInner)) {
        measured = stageInner;
      }
    }
  }

  delete cover.dataset.magMeasuring;
  book.classList.remove('is-paginating');
  cover.hidden = wasCoverHidden;
  visibleOthers.forEach((el) => {
    el.hidden = false;
  });

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
  if (pageEl.scrollHeight > targetHeight + 2 || canvas.scrollHeight > maxAllowed + 2) {
    return true;
  }

  const pageRect = pageEl.getBoundingClientRect?.();
  if (pageRect && pageRect.height > 0) {
    const limitBottom = pageRect.top + targetHeight - 1;
    const visualEls = pageEl.querySelectorAll<HTMLElement>(
      '.mag-photo-figure, .case-card, .event-card, .service-card, .faq-item, .custom-text-card, .custom-ref-card, .mag-extra-article, .mag-note-box, .mag-right-dossier, .mag-ref-mini-trio, .quote-block, .brief-form > *, .mag-folio-oval',
    );
    for (const item of visualEls) {
      if (item.hidden || typeof item.getBoundingClientRect !== 'function') continue;
      const r = item.getBoundingClientRect();
      if (r && r.height > 0 && r.bottom > limitBottom) {
        return true;
      }
    }
  }

  return false;
}

interface SplittablePick {
  source: HTMLElement;
  minKeep: number;
}

function findSplittableSource(pageEl: HTMLElement, allowLastCardOverflow = false): SplittablePick | null {
  const effectiveRules: SplittableRule[] = allowLastCardOverflow
    ? PRIMARY_SPLIT_RULES.map((rule) =>
        rule.selector === '.brief-form' ? rule : { selector: rule.selector, minKeep: 0 },
      )
    : PRIMARY_SPLIT_RULES;

  for (const rule of effectiveRules) {
    const candidates = Array.from(pageEl.querySelectorAll<HTMLElement>(rule.selector));
    for (let i = candidates.length - 1; i >= 0; i--) {
      const candidate = candidates[i];
      const children = getMovableChildren(candidate);
      if (children.length > rule.minKeep) {
        return { source: candidate, minKeep: rule.minKeep };
      }
    }
  }

  const leftStage = pageEl.querySelector<HTMLElement>('.mag-ref-left-stage');
  if (leftStage) {
    const proseCopies = getMovableChildren(leftStage);
    if (proseCopies.length > 0) {
      return { source: leftStage, minKeep: 0 };
    }
  }

  const rightCol = pageEl.querySelector<HTMLElement>('.mag-ref-right-col');
  if (rightCol) {
    const cards = getMovableChildren(rightCol);
    if (cards.length > 0) {
      return { source: rightCol, minKeep: 0 };
    }
  }

  if (!allowLastCardOverflow) {
    const hasHeading = pageEl.querySelector('.mag-zine-head') !== null;
    if (hasHeading) {
      return findSplittableSource(pageEl, true);
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
    const all = Array.from(source.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.hidden,
    );
    // Move note/dossier cards before mini-trio
    const nonTrio = all.filter((el) => !el.classList.contains('mag-ref-mini-trio'));
    return nonTrio.length > 0 ? nonTrio : all;
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

        while (pageOverflowsHeight(currentEl, targetHeight) && guard < 80) {
          guard += 1;
          const pick = findSplittableSource(currentEl);
          if (!pick) break;

          const movable = getMovableChildren(pick.source);
          if (movable.length <= pick.minKeep) break;

          const lastChild = movable[movable.length - 1];
          const originalContainer =
            state.movedItems.find((item) => item.node === lastChild)?.container ?? pick.source;
          const isFormNode =
            pick.source.id === 'brief-form' || Boolean(lastChild.closest('#brief-form'));
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
        const contSheet = contArticle.querySelector<HTMLElement>('.mag-ref-sheet');
        const contStage = contArticle.querySelector<HTMLElement>('.mag-ref-left-stage');
        const contHead = contStage?.querySelector<HTMLElement>('.mag-zine-head') ?? null;

        let contPhotos: HTMLElement | null = null;
        let contRightCol: HTMLElement | null = null;
        let activeDest: HTMLElement | null = null;
        let activeDestKey = '';

        for (const item of ordered) {
          state.movedItems.push(item);

          if (item.container.classList.contains('mag-ref-photos')) {
            if (!contPhotos) {
              contPhotos = document.createElement('div');
              contPhotos.className = 'mag-ref-photos';
              contArticle.classList.remove('no-photos');
              if (contHead) {
                contHead.insertAdjacentElement('beforebegin', contPhotos);
              } else {
                contStage?.prepend(contPhotos);
              }
            }
            contPhotos.append(item.node);
            continue;
          }

          if (item.container.classList.contains('mag-ref-right-col')) {
            if (!contRightCol) {
              contRightCol = document.createElement('aside');
              contRightCol.className = 'mag-ref-right-col';
              if (contStage) contStage.style.removeProperty('grid-column');
              contSheet?.append(contRightCol);
            }
            contRightCol.append(item.node);
            continue;
          }

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
