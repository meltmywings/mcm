import indexHtmlRaw from '../../index.html?raw';
import type {
  BuiltinSectionKey,
  CampaignEvent,
  CaseStudy,
  CustomSection,
  FaqItem,
  HeroButton,
  MagazinePhoto,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
} from '../types/cms';
import {
  applyHiddenSections,
  applySiteContent,
  renderCampaigns,
  renderCustomSections,
  renderHeroButtons,
  renderMetrics,
  renderPagePhotos,
  renderPageTextBlocks,
  renderProcessSteps,
  renderServices,
} from './cmsView';
import { initFaq } from './faq';
import { initBriefForm } from './form';
import { initMagazineBook, type MagazineBookController } from './magazineBook';
import { initTickerToggle, renderTicker } from './motion';
import { initWorkSection } from './work';

export interface AdminMagazineState {
  siteContent: SiteContent;
  heroButtons: HeroButton[];
  metrics: MetricItem[];
  tickerItems: string[];
  caseStudies: CaseStudy[];
  campaigns: CampaignEvent[];
  services: ServicePillar[];
  processSteps: ProcessStep[];
  faqs: FaqItem[];
  customSections: CustomSection[];
  hiddenSections: BuiltinSectionKey[];
  pagePhotos: Record<string, MagazinePhoto[]>;
  pageTextBlocks: Record<string, PageTextBlock[]>;
}

const MINI_PENCIL = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const MINI_BIN = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const MINI_PLUS = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

function makeActionBtn(
  kind: 'edit' | 'delete' | 'add',
  label: string,
  action: string,
  attrs: Record<string, string | number> = {},
  shortText?: string,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    kind === 'delete'
      ? 'admin-mag-btn is-delete'
      : kind === 'add'
        ? 'admin-mag-btn is-add'
        : 'admin-mag-btn';
  btn.dataset.action = action;
  for (const [k, v] of Object.entries(attrs)) {
    btn.setAttribute(`data-${k}`, String(v));
  }
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.innerHTML =
    (kind === 'edit' ? MINI_PENCIL : kind === 'delete' ? MINI_BIN : MINI_PLUS) +
    (shortText ? `<span>${shortText}</span>` : '');
  return btn;
}

function attachOverlayCluster(
  host: HTMLElement,
  buttons: HTMLButtonElement[],
  extraClass = '',
): void {
  const computed = typeof getComputedStyle === 'function' ? getComputedStyle(host).position : '';
  if (!host.style.position && (!computed || computed === 'static')) {
    host.style.position = 'relative';
  }
  const wrap = document.createElement('div');
  wrap.className = extraClass ? `admin-el-controls ${extraClass}` : 'admin-el-controls';
  wrap.append(...buttons);
  host.append(wrap);
}

function attachPageToolbar(pageEl: HTMLElement, buttons: HTMLButtonElement[]): void {
  const targetParent =
    pageEl.querySelector<HTMLElement>('.mag-cover-overlay, .mag-spread-canvas') ?? pageEl;
  const bar = document.createElement('div');
  bar.className = 'admin-page-toolbar';
  bar.append(...buttons);
  targetParent.prepend(bar);
}

function injectAdminControls(stageRoot: HTMLElement, state: AdminMagazineState): void {
  // 1. Cover page (#cover)
  const cover = stageRoot.querySelector<HTMLElement>('#cover');
  if (cover) {
    const coverPhotos = state.pagePhotos.cover ?? [];
    const toolbarBtns: HTMLButtonElement[] = [
      makeActionBtn('edit', 'Edit Cover masthead and subtitle', 'edit-hero', {}, 'Masthead'),
      makeActionBtn('add', 'Add cover CTA button', 'add-hero-btn', {}, 'Button'),
      makeActionBtn('add', 'Add sticker or image to Cover', 'add-page-photo', { page: 'cover' }, 'Sticker/Img'),
    ];
    if (coverPhotos.length > 0) {
      toolbarBtns.push(
        makeActionBtn(
          'edit',
          'Replace Cover photo',
          'edit-page-photo',
          { page: 'cover', idx: 0 },
          'Replace Cover',
        ),
        makeActionBtn(
          'delete',
          'Remove Cover photo',
          'delete-page-photo',
          { page: 'cover', idx: 0 },
        ),
      );
    }
    toolbarBtns.push(
      makeActionBtn('delete', 'Hide Cover section', 'hide-section', { section: 'hero' }),
    );
    attachPageToolbar(cover, toolbarBtns);

    const heroActions = cover.querySelector<HTMLElement>('#hero-actions');
    if (heroActions) {
      Array.from(heroActions.querySelectorAll<HTMLElement>(':scope > a')).forEach((link, idx) => {
        const chip = document.createElement('span');
        chip.className = 'admin-inline-chip';
        link.replaceWith(chip);
        chip.append(link);
        attachOverlayCluster(chip, [
          makeActionBtn('edit', `Edit button ${idx + 1}`, 'edit-hero-btn', { idx }),
          makeActionBtn('delete', `Delete button ${idx + 1}`, 'delete-hero-btn', { idx }),
        ]);
      });
    }
  }

  // 2. Metrics & Ticker (#metrics)
  const metricsPage = stageRoot.querySelector<HTMLElement>('#metrics');
  if (metricsPage) {
    attachPageToolbar(metricsPage, [
      makeActionBtn('add', 'Add impact metric', 'add-metric', {}, 'Metric'),
      makeActionBtn('add', 'Add ticker phrase', 'add-ticker', {}, 'Ticker'),
      makeActionBtn('add', 'Add sticker or image to Metrics', 'add-page-photo', { page: 'metrics' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Metrics', 'add-page-text', { page: 'metrics' }, 'Text'),
      makeActionBtn('delete', 'Hide Metrics section', 'hide-section', { section: 'metrics' }),
    ]);

    metricsPage
      .querySelectorAll<HTMLElement>('#ticker-track > li:not([aria-hidden="true"])')
      .forEach((li, idx) => {
        li.classList.add('admin-ticker-chip');
        li.append(
          makeActionBtn('edit', `Edit ticker ${idx + 1}`, 'edit-ticker', { idx }),
          makeActionBtn('delete', `Delete ticker ${idx + 1}`, 'delete-ticker', { idx }),
        );
      });

    metricsPage.querySelectorAll<HTMLElement>('#metrics-list > li').forEach((li, idx) => {
      attachOverlayCluster(li, [
        makeActionBtn('edit', `Edit metric ${idx + 1}`, 'edit-metric', { idx }),
        makeActionBtn('delete', `Delete metric ${idx + 1}`, 'delete-metric', { idx }),
      ]);
    });
  }

  // 3. Work (#work & #work-2)
  const workPage = stageRoot.querySelector<HTMLElement>('#work');
  if (workPage) {
    attachPageToolbar(workPage, [
      makeActionBtn('edit', 'Edit Cover Stories header', 'edit-work-header', {}, 'Header'),
      makeActionBtn('add', 'Add case study', 'add-case', {}, 'Case'),
      makeActionBtn('add', 'Add sticker or image to Work I', 'add-page-photo', { page: 'work' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Work I', 'add-page-text', { page: 'work' }, 'Text'),
      makeActionBtn('delete', 'Hide Work section', 'hide-section', { section: 'work' }),
    ]);
  }
  const workPage2 = stageRoot.querySelector<HTMLElement>('#work-2');
  if (workPage2) {
    attachPageToolbar(workPage2, [
      makeActionBtn('add', 'Add case study', 'add-case', {}, 'Case'),
      makeActionBtn('add', 'Add sticker or image to Work II', 'add-page-photo', { page: 'work-2' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Work II', 'add-page-text', { page: 'work-2' }, 'Text'),
    ]);
  }
  stageRoot.querySelectorAll<HTMLElement>('#work-grid > .case-card, #work-grid-2 > .case-card').forEach((card) => {
    const caseId = card.dataset.caseId;
    const idx = state.caseStudies.findIndex((c) => c.id === caseId);
    if (idx < 0) return;
    attachOverlayCluster(card, [
      makeActionBtn('add', 'Add TikTok/Instagram link to case', 'add-ref', { owner: 'case', idx }, 'Link'),
      makeActionBtn('edit', 'Edit case study', 'edit-case', { idx }),
      makeActionBtn('delete', 'Delete case study', 'delete-case', { idx }),
    ]);
    card.querySelectorAll<HTMLElement>('.ref-links > a.ref-pill').forEach((pill, refIdx) => {
      const chip = document.createElement('span');
      chip.className = 'admin-inline-chip';
      pill.replaceWith(chip);
      chip.append(pill);
      attachOverlayCluster(chip, [
        makeActionBtn('edit', 'Edit reference link', 'edit-ref', { owner: 'case', idx, 'ref-idx': refIdx }),
        makeActionBtn('delete', 'Delete reference link', 'delete-ref', { owner: 'case', idx, 'ref-idx': refIdx }),
      ]);
    });
  });

  // 4. Events (#events)
  const eventsPage = stageRoot.querySelector<HTMLElement>('#events');
  if (eventsPage) {
    attachPageToolbar(eventsPage, [
      makeActionBtn('edit', 'Edit Live Events header', 'edit-events-header', {}, 'Header'),
      makeActionBtn('add', 'Add live campaign or event', 'add-campaign', {}, 'Event'),
      makeActionBtn('add', 'Add sticker or image to Events', 'add-page-photo', { page: 'events' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Events', 'add-page-text', { page: 'events' }, 'Text'),
      makeActionBtn('delete', 'Hide Events section', 'hide-section', { section: 'events' }),
    ]);
    eventsPage.querySelectorAll<HTMLElement>('#events-grid > .event-card').forEach((card) => {
      const campId = card.dataset.campaignId;
      const idx = state.campaigns.findIndex((c) => c.id === campId);
      if (idx < 0) return;
      attachOverlayCluster(card, [
        makeActionBtn('add', 'Add social link to campaign', 'add-ref', { owner: 'campaign', idx }, 'Link'),
        makeActionBtn('edit', 'Edit campaign', 'edit-campaign', { idx }),
        makeActionBtn('delete', 'Delete campaign', 'delete-campaign', { idx }),
      ]);
      card.querySelectorAll<HTMLElement>('.ref-links > a.ref-pill').forEach((pill, refIdx) => {
        const chip = document.createElement('span');
        chip.className = 'admin-inline-chip';
        pill.replaceWith(chip);
        chip.append(pill);
        attachOverlayCluster(chip, [
          makeActionBtn('edit', 'Edit reference link', 'edit-ref', { owner: 'campaign', idx, 'ref-idx': refIdx }),
          makeActionBtn('delete', 'Delete reference link', 'delete-ref', { owner: 'campaign', idx, 'ref-idx': refIdx }),
        ]);
      });
    });
  }

  // 5. Services (#services & #services-2)
  const servicesPage = stageRoot.querySelector<HTMLElement>('#services');
  if (servicesPage) {
    attachPageToolbar(servicesPage, [
      makeActionBtn('edit', 'Edit Capabilities header', 'edit-services-header', {}, 'Header'),
      makeActionBtn('add', 'Add capability pillar', 'add-service', {}, 'Pillar'),
      makeActionBtn('add', 'Add sticker or image to Capabilities I', 'add-page-photo', { page: 'services' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Capabilities I', 'add-page-text', { page: 'services' }, 'Text'),
      makeActionBtn('delete', 'Hide Capabilities section', 'hide-section', { section: 'services' }),
    ]);
    servicesPage.querySelectorAll<HTMLElement>('#services-grid > .service-card').forEach((card, idx) => {
      attachOverlayCluster(card, [
        makeActionBtn('edit', `Edit capability ${idx + 1}`, 'edit-service', { idx }),
        makeActionBtn('delete', `Delete capability ${idx + 1}`, 'delete-service', { idx }),
      ]);
    });
  }
  const servicesPage2 = stageRoot.querySelector<HTMLElement>('#services-2');
  if (servicesPage2) {
    attachPageToolbar(servicesPage2, [
      makeActionBtn('add', 'Add capability pillar', 'add-service', {}, 'Pillar'),
      makeActionBtn('add', 'Add sticker or image to Capabilities II', 'add-page-photo', { page: 'services-2' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Capabilities II', 'add-page-text', { page: 'services-2' }, 'Text'),
    ]);
    servicesPage2.querySelectorAll<HTMLElement>('#services-grid-2 > .service-card').forEach((card, offset) => {
      const idx = 2 + offset;
      attachOverlayCluster(card, [
        makeActionBtn('edit', `Edit capability ${idx + 1}`, 'edit-service', { idx }),
        makeActionBtn('delete', `Delete capability ${idx + 1}`, 'delete-service', { idx }),
      ]);
    });
  }

  // 6. Culture Lab (#culture-lab)
  const culturePage = stageRoot.querySelector<HTMLElement>('#culture-lab');
  if (culturePage) {
    attachPageToolbar(culturePage, [
      makeActionBtn('edit', 'Edit Culture Lab header', 'edit-culture-header', {}, 'Header'),
      makeActionBtn('add', 'Add operating step', 'add-step', {}, 'Step'),
      makeActionBtn('add', 'Add sticker or image to Culture Lab', 'add-page-photo', { page: 'culture-lab' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Culture Lab', 'add-page-text', { page: 'culture-lab' }, 'Text'),
      makeActionBtn('delete', 'Hide Culture Lab section', 'hide-section', { section: 'culture-lab' }),
    ]);
    const quote = culturePage.querySelector<HTMLElement>('.quote-block');
    if (quote) {
      attachOverlayCluster(quote, [makeActionBtn('edit', 'Edit client quote', 'edit-quote')]);
    }
    culturePage.querySelectorAll<HTMLElement>('#process-grid > .process-card').forEach((card, idx) => {
      attachOverlayCluster(card, [
        makeActionBtn('edit', `Edit step ${idx + 1}`, 'edit-step', { idx }),
        makeActionBtn('delete', `Delete step ${idx + 1}`, 'delete-step', { idx }),
      ]);
    });
  }

  // 7. FAQ (#faq & #faq-2)
  const faqPage = stageRoot.querySelector<HTMLElement>('#faq');
  if (faqPage) {
    attachPageToolbar(faqPage, [
      makeActionBtn('edit', 'Edit FAQ header', 'edit-faq-header', {}, 'Header'),
      makeActionBtn('add', 'Add FAQ question', 'add-faq', {}, 'FAQ'),
      makeActionBtn('add', 'Add sticker or image to FAQ I', 'add-page-photo', { page: 'faq' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to FAQ I', 'add-page-text', { page: 'faq' }, 'Text'),
      makeActionBtn('delete', 'Hide FAQ section', 'hide-section', { section: 'faq' }),
    ]);
    faqPage.querySelectorAll<HTMLElement>('#faq-list > .faq-item').forEach((item, idx) => {
      attachOverlayCluster(item, [
        makeActionBtn('edit', `Edit FAQ ${idx + 1}`, 'edit-faq', { idx }),
        makeActionBtn('delete', `Delete FAQ ${idx + 1}`, 'delete-faq', { idx }),
      ]);
    });
  }
  const faqPage2 = stageRoot.querySelector<HTMLElement>('#faq-2');
  if (faqPage2) {
    attachPageToolbar(faqPage2, [
      makeActionBtn('add', 'Add FAQ question', 'add-faq', {}, 'FAQ'),
      makeActionBtn('add', 'Add sticker or image to FAQ II', 'add-page-photo', { page: 'faq-2' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to FAQ II', 'add-page-text', { page: 'faq-2' }, 'Text'),
    ]);
    faqPage2.querySelectorAll<HTMLElement>('#faq-list-2 > .faq-item').forEach((item, offset) => {
      const idx = 2 + offset;
      attachOverlayCluster(item, [
        makeActionBtn('edit', `Edit FAQ ${idx + 1}`, 'edit-faq', { idx }),
        makeActionBtn('delete', `Delete FAQ ${idx + 1}`, 'delete-faq', { idx }),
      ]);
    });
  }

  // 8. Brief & Directory (#brief, #directory)
  const briefPage = stageRoot.querySelector<HTMLElement>('#brief');
  if (briefPage) {
    attachPageToolbar(briefPage, [
      makeActionBtn('edit', 'Edit Brief header & submit label', 'edit-brief-header', {}, 'Header'),
      makeActionBtn('add', 'Add sticker or image to Brief', 'add-page-photo', { page: 'brief' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Brief', 'add-page-text', { page: 'brief' }, 'Text'),
      makeActionBtn('delete', 'Hide Brief section', 'hide-section', { section: 'brief' }),
    ]);
  }
  const dirPage = stageRoot.querySelector<HTMLElement>('#directory');
  if (dirPage) {
    attachPageToolbar(dirPage, [
      makeActionBtn('add', 'Add sticker or image to Directory', 'add-page-photo', { page: 'directory' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Directory', 'add-page-text', { page: 'directory' }, 'Text'),
    ]);
  }

  // 9. Custom Pages
  stageRoot.querySelectorAll<HTMLElement>('[data-custom-section]').forEach((pageEl, sIdx) => {
    const secId = pageEl.dataset.customSection || '';
    const pageKey = `custom-${secId}`;
    attachPageToolbar(pageEl, [
      makeActionBtn('edit', 'Edit page title and subtitle', 'edit-custom-section', { 's-idx': sIdx }, 'Header'),
      makeActionBtn('add', 'Add text card', 'add-custom-el', { 's-idx': sIdx, kind: 'text' }, 'Text'),
      makeActionBtn('add', 'Add CTA button', 'add-custom-el', { 's-idx': sIdx, kind: 'button' }, 'Btn'),
      makeActionBtn('add', 'Add TikTok/Instagram link', 'add-custom-el', { 's-idx': sIdx, kind: 'reference' }, 'Link'),
      makeActionBtn('add', 'Add sticker or image', 'add-page-photo', { page: pageKey, 'c-idx': sIdx }, 'Sticker'),
      makeActionBtn('delete', 'Delete custom page', 'delete-custom-section', { 's-idx': sIdx }),
    ]);
    pageEl.querySelectorAll<HTMLElement>('.custom-elements-grid > *').forEach((card, eIdx) => {
      attachOverlayCluster(card, [
        makeActionBtn('edit', 'Edit element', 'edit-custom-el', { 's-idx': sIdx, 'e-idx': eIdx }),
        makeActionBtn('delete', 'Delete element', 'delete-custom-el', { 's-idx': sIdx, 'e-idx': eIdx }),
      ]);
    });
  });

  // 10. Universal floating cutout stickers, sidebar note stickers & extra text columns across ALL pages
  stageRoot.querySelectorAll<HTMLElement>('[data-page-photos]').forEach((container) => {
    const pageKey = container.dataset.pagePhotos;
    if (!pageKey || pageKey === 'cover') return;
    container.querySelectorAll<HTMLElement>(':scope > .mag-photo-figure').forEach((fig, idx) => {
      attachOverlayCluster(
        fig,
        [
          makeActionBtn('edit', `Replace sticker or image on ${pageKey}`, 'edit-page-photo', {
            page: pageKey,
            idx,
          }),
          makeActionBtn('delete', `Remove sticker or image from ${pageKey}`, 'delete-page-photo', {
            page: pageKey,
            idx,
          }),
        ],
        'is-sticker-controls',
      );
    });
  });

  stageRoot.querySelectorAll<HTMLImageElement>('[data-page-note-cutout]').forEach((img) => {
    const pageKey = img.dataset.pageNoteCutout;
    const box = img.closest<HTMLElement>('.mag-note-box');
    if (!pageKey || !box) return;
    const noteKey = `note-${pageKey}`;
    if (img.hidden) {
      attachOverlayCluster(
        box,
        [
          makeActionBtn('add', `Add or restore note sticker on ${pageKey}`, 'add-page-photo', {
            page: noteKey,
          }),
        ],
        'is-note-sticker-controls',
      );
    } else {
      attachOverlayCluster(
        box,
        [
          makeActionBtn('edit', `Replace sidebar note sticker on ${pageKey}`, 'edit-page-photo', {
            page: noteKey,
            idx: 0,
          }),
          makeActionBtn('delete', `Remove sidebar note sticker from ${pageKey}`, 'delete-page-photo', {
            page: noteKey,
            idx: 0,
          }),
        ],
        'is-note-sticker-controls',
      );
    }
  });

  stageRoot.querySelectorAll<HTMLElement>('[data-page-texts]').forEach((container) => {
    const pageKey = container.dataset.pageTexts;
    if (!pageKey) return;
    Array.from(container.children).forEach((child, idx) => {
      if (!(child instanceof HTMLElement)) return;
      attachOverlayCluster(child, [
        makeActionBtn('edit', `Edit extra text block ${idx + 1}`, 'edit-page-text', {
          page: pageKey,
          idx,
        }),
        makeActionBtn('delete', `Delete extra text block ${idx + 1}`, 'delete-page-text', {
          page: pageKey,
          idx,
        }),
      ]);
    });
  });
}

export interface AdminCloneHandle {
  controller: MagazineBookController | null;
  destroy: () => void;
}

export function mountAdminMagazineClone(
  hostContainer: HTMLElement,
  state: AdminMagazineState,
  onAction: (target: HTMLElement) => void,
  initialPageId?: string,
): AdminCloneHandle {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(indexHtmlRaw, 'text/html');
  const book = parsed.querySelector<HTMLElement>('#mag-book');
  const pager = parsed.querySelector<HTMLElement>('.mag-pager');
  const caseDialog = parsed.querySelector<HTMLElement>('#case-dialog');
  const glossaryDialog = parsed.querySelector<HTMLElement>('#glossary-dialog');

  const stage = document.createElement('div');
  stage.id = 'admin-mag-stage';
  stage.className = 'mag-stage is-admin-stage';

  if (book) {
    stage.append(document.importNode(book, true));
  }
  if (pager) {
    stage.append(document.importNode(pager, true));
  }
  if (glossaryDialog) {
    stage.append(document.importNode(glossaryDialog, true));
  }
  if (caseDialog) {
    stage.append(document.importNode(caseDialog, true));
  }

  hostContainer.replaceChildren(stage);

  // Measure actual admin chrome above #admin-mag-stage so height matches exact remaining viewport
  const stageTop = Math.max(0, Math.round(stage.getBoundingClientRect?.().top ?? 0));
  if (stageTop > 0) {
    stage.style.setProperty('--admin-stage-top', `${stageTop}px`);
  }

  // Render all live CMS state identically to main.ts
  renderHeroButtons(stage.querySelector<HTMLElement>('#hero-actions'), state.heroButtons);
  applySiteContent(stage, state.siteContent);
  renderMetrics(stage.querySelector<HTMLElement>('#metrics-list'), state.metrics);
  renderTicker(stage.querySelector<HTMLElement>('#ticker-track'), state.tickerItems);
  initTickerToggle(
    stage.querySelector<HTMLButtonElement>('#ticker-toggle'),
    stage.querySelector<HTMLElement>('#ticker-track'),
  );
  initWorkSection(stage, state.caseStudies);
  renderCampaigns(stage.querySelector<HTMLElement>('#events-grid'), state.campaigns);
  renderServices(
    stage.querySelector<HTMLElement>('#services-grid'),
    state.services,
    stage.querySelector<HTMLElement>('#services-grid-2'),
  );
  renderProcessSteps(stage.querySelector<HTMLElement>('#process-grid'), state.processSteps);
  initFaq(
    stage.querySelector<HTMLElement>('#faq-list'),
    state.faqs,
    stage.querySelector<HTMLElement>('#faq-list-2'),
  );
  renderCustomSections(
    stage.querySelector<HTMLElement>('#custom-sections-root'),
    state.customSections,
    state.pagePhotos,
    state.pageTextBlocks,
  );
  renderPagePhotos(stage, state.pagePhotos);
  renderPageTextBlocks(stage, state.pageTextBlocks);
  applyHiddenSections(stage, state.hiddenSections);
  const briefCtrl = initBriefForm(stage);

  // Inject zero-flow +, Pencil, Bin icons BEFORE paginating so they travel with continuation pages
  injectAdminControls(stage, state);

  const controller = initMagazineBook(stage);

  if (initialPageId && controller) {
    controller.goToPageById(initialPageId, true);
  }

  const handleActionClick = (e: Event) => {
    const actionEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!actionEl) return;
    e.preventDefault();
    e.stopPropagation();
    onAction(actionEl);
  };

  stage.addEventListener('click', handleActionClick, true);

  return {
    controller,
    destroy: () => {
      stage.removeEventListener('click', handleActionClick, true);
      briefCtrl?.destroy();
      controller?.destroy();
    },
  };
}
