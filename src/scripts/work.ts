import { CASE_STUDIES, type CaseStudy, type ChannelFilter } from '../data/agency';

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

    li.innerHTML = `
      <div>
        <div class="case-meta">
          <span class="case-tag">${study.channelLabel}</span>
          <span class="case-sector">${study.sector}</span>
        </div>
        <h3 class="case-client">${study.client}</h3>
        <p class="case-summary">${study.summary}</p>
      </div>
      <div>
        <div class="case-metrics">
          <span class="case-metric-primary">${study.headlineMetric}</span>
          <span class="case-metric-secondary">${study.secondaryMetric}</span>
        </div>
        <div style="margin-block-start: 1.25rem;">
          <button type="button" class="btn btn-secondary" data-open-case="${study.id}">
            View Case Study <span class="visually-hidden">for ${study.client}</span>
          </button>
        </div>
      </div>
    `;
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
  const countEl = root.querySelector<HTMLElement>('#work-count');
  const filterButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const dialog = root.querySelector<HTMLDialogElement>('#case-dialog');

  let activeStudies: CaseStudy[] = [...initialStudies];
  let currentFilter: ChannelFilter = 'all';

  renderCaseStudies(grid, activeStudies);

  const applyFilter = (filter: ChannelFilter) => {
    currentFilter = filter;
    const allowedIds = new Set(filterCaseStudies(activeStudies, filter).map((item) => item.id));
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
  };

  const updateStudies = (nextStudies: readonly CaseStudy[]) => {
    activeStudies = [...nextStudies];
    renderCaseStudies(grid, activeStudies);
    applyFilter(currentFilter);
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextFilter = (btn.dataset.filter as ChannelFilter) || 'all';
      applyFilter(nextFilter);
    });
  });

  if (dialog) {
    setupCaseDialog(dialog, grid, root, () => activeStudies);
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

  if (channelEl) channelEl.textContent = `${study.channelLabel} · ${study.sector}`;
  if (titleEl) titleEl.textContent = `${study.client} — ${study.title}`;
  if (challengeEl) challengeEl.textContent = study.challenge;
  if (strategyEl) strategyEl.textContent = study.strategy;

  if (metricsEl) {
    metricsEl.innerHTML = `
      <span class="case-metric-primary">${study.headlineMetric}</span>
      <span class="case-metric-secondary">${study.secondaryMetric}</span>
    `;
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
