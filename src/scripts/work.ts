import { CASE_STUDIES, type CaseStudy, type ChannelFilter } from '../data/agency';
import { createReferenceLinksElement } from './cmsView';

export function filterCaseStudies(studies: readonly CaseStudy[], filter: ChannelFilter): CaseStudy[] {
  if (filter === 'all') return [...studies];
  return studies.filter((study) => study.channel === filter);
}

export function renderCaseStudies(grid: HTMLElement | null, studies: readonly CaseStudy[]): void {
  if (!grid) return;

  const cards = studies.map((study) => {
    const li = document.createElement('li');
    li.className = 'case-card reveal-card';
    li.dataset.channel = study.channel;
    li.dataset.caseId = study.id;

    const top = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'case-meta';

    const tag = document.createElement('span');
    tag.className = 'case-tag';
    tag.textContent = study.channelLabel;

    const sector = document.createElement('span');
    sector.className = 'case-sector';
    sector.textContent = study.sector;
    meta.append(tag, ' · ', sector);

    const client = document.createElement('h3');
    client.className = 'case-client';
    client.textContent = study.client;

    const summary = document.createElement('p');
    summary.className = 'case-summary';
    summary.textContent = study.summary;

    top.append(meta, client, summary);

    const refsEl = createReferenceLinksElement(study.references);
    if (refsEl) {
      top.append(refsEl);
    }

    const bottom = document.createElement('div');
    const metrics = document.createElement('div');
    metrics.className = 'case-metrics';

    const primaryMetric = document.createElement('span');
    primaryMetric.className = 'case-metric-primary';
    primaryMetric.textContent = study.headlineMetric;

    const secondaryMetric = document.createElement('span');
    secondaryMetric.className = 'case-metric-secondary';
    secondaryMetric.textContent = study.secondaryMetric;
    metrics.append(primaryMetric, secondaryMetric);

    const btnWrap = document.createElement('div');
    btnWrap.style.marginBlockStart = '0.35rem';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn btn-secondary';
    openBtn.dataset.openCase = study.id;
    openBtn.append('View Case Study ');
    const srSpan = document.createElement('span');
    srSpan.className = 'visually-hidden';
    srSpan.textContent = `for ${study.client}`;
    openBtn.append(srSpan);
    btnWrap.append(openBtn);

    bottom.append(metrics, btnWrap);
    li.append(top, bottom);
    return li;
  });

  grid.replaceChildren(...cards);
}

export function initWorkSection(
  root: ParentNode = document,
  initialStudies: readonly CaseStudy[] = CASE_STUDIES,
): {
  applyFilter: (filter: ChannelFilter) => void;
  updateStudies: (nextStudies: readonly CaseStudy[]) => void;
} {
  const grid = root.querySelector<HTMLElement>('#work-grid');
  const grid2 = root.querySelector<HTMLElement>('#work-grid-2');
  const countEl = root.querySelector<HTMLElement>('#work-count');
  const filterButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const dialog = root.querySelector<HTMLDialogElement>('#case-dialog');

  let activeStudies: CaseStudy[] = [...initialStudies];
  let currentFilter: ChannelFilter = 'all';

  const renderIntoChapterGrids = () => {
    if (grid2) {
      const visible = filterCaseStudies(activeStudies, currentFilter);
      if (currentFilter === 'all') {
        renderCaseStudies(grid, visible.slice(0, 2));
        renderCaseStudies(grid2, visible.slice(2));
      } else {
        renderCaseStudies(grid, visible);
        renderCaseStudies(grid2, []);
      }
      if (countEl) {
        countEl.textContent = `Showing ${visible.length} ${visible.length === 1 ? 'case study' : 'case studies'}`;
      }
      return;
    }
    renderCaseStudies(grid, activeStudies);
  };

  const emitBookLifecycle = (eventName: string) => {
    const target = grid ?? grid2 ?? root.querySelector<HTMLElement>('#work');
    target?.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
  };

  renderIntoChapterGrids();

  const applyFilter = (filter: ChannelFilter) => {
    emitBookLifecycle('mcm:before-content-update');
    currentFilter = filter;
    const allowedIds = new Set(filterCaseStudies(activeStudies, filter).map((item) => item.id));

    if (grid2) {
      renderIntoChapterGrids();
      filterButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
      });
      emitBookLifecycle('mcm:content-updated');
      return;
    }

    let visibleCount = 0;

    grid?.querySelectorAll<HTMLLIElement>('.case-card').forEach((card) => {
      const visible = allowedIds.has(card.dataset.caseId ?? '');
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    filterButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
    });

    if (countEl) {
      countEl.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'case study' : 'case studies'}`;
    }
    emitBookLifecycle('mcm:content-updated');
  };

  const updateStudies = (nextStudies: readonly CaseStudy[]) => {
    emitBookLifecycle('mcm:before-content-update');
    activeStudies = [...nextStudies];
    renderIntoChapterGrids();
    applyFilter(currentFilter);
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextFilter = (btn.dataset.filter as ChannelFilter) || 'all';
      applyFilter(nextFilter);
    });
  });

  if (dialog) {
    const book = root.querySelector<HTMLElement>('#mag-book');
    if (book) {
      setupCaseDialog(dialog, book, root, () => activeStudies);
    } else {
      setupCaseDialog(dialog, grid, root, () => activeStudies);
      if (grid2) {
        setupCaseDialog(dialog, grid2, root, () => activeStudies);
      }
    }
  }

  return { applyFilter, updateStudies };
}

function populateDialog(dialog: HTMLDialogElement, study: CaseStudy): void {
  const channelEl = dialog.querySelector('#case-dialog-channel');
  const titleEl = dialog.querySelector('#case-dialog-title');
  const metricsEl = dialog.querySelector('#case-dialog-metrics');
  const challengeEl = dialog.querySelector('#case-dialog-challenge');
  const strategyEl = dialog.querySelector('#case-dialog-strategy');
  const deliverablesEl = dialog.querySelector('#case-dialog-deliverables');
  const refsSection = dialog.querySelector<HTMLElement>('#case-dialog-references-section');
  const refsContainer = dialog.querySelector<HTMLElement>('#case-dialog-references');

  if (channelEl) channelEl.textContent = `${study.channelLabel} · ${study.sector}`;
  if (titleEl) titleEl.textContent = `${study.client} — ${study.title}`;
  if (challengeEl) challengeEl.textContent = study.challenge;
  if (strategyEl) strategyEl.textContent = study.strategy;

  if (metricsEl) {
    const primary = document.createElement('span');
    primary.className = 'case-metric-primary';
    primary.textContent = study.headlineMetric;

    const secondary = document.createElement('span');
    secondary.className = 'case-metric-secondary';
    secondary.textContent = study.secondaryMetric;

    metricsEl.replaceChildren(primary, secondary);
  }

  if (deliverablesEl) {
    deliverablesEl.replaceChildren(
      ...study.deliverables.map((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        return li;
      }),
    );
  }

  if (refsSection && refsContainer) {
    const refsEl = createReferenceLinksElement(study.references);
    if (refsEl) {
      refsContainer.replaceChildren(refsEl);
      refsSection.hidden = false;
    } else {
      refsContainer.replaceChildren();
      refsSection.hidden = true;
    }
  }
}

export function setupCaseDialog(
  dialog: HTMLDialogElement,
  grid: HTMLElement | null,
  root: ParentNode = document,
  getStudies: () => readonly CaseStudy[] = () => CASE_STUDIES,
): void {
  grid?.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-open-case]');
    if (!trigger) return;
    const study = getStudies().find((item) => item.id === trigger.dataset.openCase);
    if (!study) return;

    populateDialog(dialog, study);
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  });

  const ctaLink = root.querySelector<HTMLAnchorElement>('#case-dialog-cta');
  ctaLink?.addEventListener('click', () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close('brief');
    } else {
      dialog.removeAttribute('open');
    }
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });

  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    });
  }
}
