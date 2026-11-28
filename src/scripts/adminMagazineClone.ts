import indexHtmlRaw from '../../index.html?raw';
import type {
  BuiltinSectionKey,
  CampaignEvent,
  CaseStudy,
  CustomSection,
  ElementLayout,
  FaqItem,
  HeroButton,
  MagazinePhoto,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
  TextOverride,
} from '../types/cms';
import {
  applyElementLayouts,
  applyHiddenSections,
  applySiteContent,
  applyTextOverrides,
  assignEditableLayoutKeys,
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
import { createRepositionController, type RepositionController } from './repositionController';
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
  textOverrides?: Record<string, TextOverride>;
  elementLayouts?: Record<string, ElementLayout>;
}

const MINI_PENCIL = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const MINI_BIN = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const MINI_PLUS = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const MINI_MOVE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`;

function makeActionBtn(
  kind: 'edit' | 'delete' | 'add' | 'move',
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
        : kind === 'move'
          ? 'admin-mag-btn is-move'
          : 'admin-mag-btn';
  btn.dataset.action = action;
  for (const [k, v] of Object.entries(attrs)) {
    btn.setAttribute(`data-${k}`, String(v));
  }
  btn.setAttribute('aria-label', label);
  btn.title = label;
  const icon =
    kind === 'edit'
      ? MINI_PENCIL
      : kind === 'delete'
        ? MINI_BIN
        : kind === 'move'
          ? MINI_MOVE
          : MINI_PLUS;
  btn.innerHTML = icon + (shortText ? `<span>${shortText}</span>` : '');
  return btn;
}

function makeMoveBtn(label: string): HTMLButtonElement {
  return makeActionBtn('move', `Reposition or pinch-resize ${label}`, 'toggle-reposition');
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

function attachTextAndHeadControls(
  pageEl: HTMLElement,
  pageKey: string,
  headAction: string | null,
  hideSectionKey: BuiltinSectionKey | null,
  headAttrs: Record<string, string | number> = {},
  customDeleteIdx?: number,
): void {
  const head = pageEl.querySelector<HTMLElement>(
    '.mag-ref-left-stage > .mag-zine-head, .mag-glossary-sheet > .mag-zine-head',
  );
  if (head) {
    const headBtns: HTMLButtonElement[] = [makeMoveBtn(`${pageKey} heading`)];
    if (headAction) {
      headBtns.push(makeActionBtn('edit', `Edit ${pageKey} heading & subtitle`, headAction, headAttrs));
    }
    if (hideSectionKey) {
      headBtns.push(
        makeActionBtn('delete', `Hide ${pageKey} section`, 'hide-section', {
          section: hideSectionKey,
        }),
      );
    } else if (customDeleteIdx !== undefined) {
      headBtns.push(
        makeActionBtn('delete', 'Delete custom section', 'delete-custom-section', {
          's-idx': customDeleteIdx,
        }),
      );
    }
    attachOverlayCluster(head, headBtns);
  }

  pageEl
    .querySelectorAll<HTMLElement>(
      ':is(.mag-ref-left-stage, .mag-glossary-sheet) > p.mag-zine-copy, :is(.mag-ref-left-stage, .mag-glossary-sheet) > p.section-subtitle',
    )
    .forEach((p, idx) => {
      const textKey = p.dataset.textKey || `${pageKey}:copy:${idx}`;
      attachOverlayCluster(p, [
        makeMoveBtn('copy block'),
        makeActionBtn('edit', 'Edit paragraph copy', 'edit-text-override', { 'target-text-key': textKey }),
        makeActionBtn('delete', 'Hide paragraph copy', 'delete-text-override', { 'target-text-key': textKey }),
      ]);
    });

  const noteCopy = pageEl.querySelector<HTMLElement>('.mag-note-box > p.mag-zine-copy');
  if (noteCopy) {
    const textKey = noteCopy.dataset.textKey || `note:${pageKey}:copy`;
    attachOverlayCluster(noteCopy, [
      makeMoveBtn('note copy'),
      makeActionBtn('edit', `Edit ${pageKey} note text`, 'edit-text-override', { 'target-text-key': textKey }),
      makeActionBtn('delete', `Hide ${pageKey} note text`, 'delete-text-override', { 'target-text-key': textKey }),
    ]);
  }
}

function injectAdminControls(stageRoot: HTMLElement, state: AdminMagazineState): void {
  // 1. Cover page (#cover) — place Pen/Bin/Move directly on Cover backdrop, Logo, Masthead, Coverlines, & CTAs
  const cover = stageRoot.querySelector<HTMLElement>('#cover');
  if (cover) {
    const coverPhotos = state.pagePhotos.cover ?? [];
    const coverAddBtns: HTMLButtonElement[] = [
      makeActionBtn('add', 'Add cover CTA button', 'add-hero-btn', {}, 'Button'),
      makeActionBtn(
        coverPhotos.length > 0 ? 'add' : 'add',
        coverPhotos.length > 0 ? 'Add sticker or image to Cover' : 'Restore Cover photo',
        'add-page-photo',
        { page: 'cover' },
        coverPhotos.length > 0 ? 'Sticker/Img' : 'Cover Photo',
      ),
    ];
    attachPageToolbar(cover, coverAddBtns);

    cover
      .querySelectorAll<HTMLElement>('[data-page-photos="cover"] > .mag-photo-figure')
      .forEach((fig, idx) => {
        attachOverlayCluster(fig, [
          makeMoveBtn('cover photo'),
          makeActionBtn('edit', 'Replace cover image', 'edit-page-photo', { page: 'cover', idx }),
          makeActionBtn('delete', 'Remove cover image', 'delete-page-photo', { page: 'cover', idx }),
        ]);
      });

    const heroTitle = cover.querySelector<HTMLElement>('.hero-brand-title');
    if (heroTitle) {
      attachOverlayCluster(heroTitle, [
        makeMoveBtn('cover logo'),
        makeActionBtn('edit', 'Replace cover logo artwork', 'edit-hero-logo'),
        makeActionBtn('delete', 'Reset cover logo to default', 'reset-hero-logo'),
      ]);
    }

    const subtitleEl = cover.querySelector<HTMLElement>('#hero-brand-subtitle');
    if (subtitleEl) {
      attachOverlayCluster(subtitleEl, [
        makeMoveBtn('masthead text'),
        makeActionBtn('edit', 'Edit Cover masthead and subtitle', 'edit-hero'),
        makeActionBtn('delete', 'Hide Cover section', 'hide-section', { section: 'hero' }),
      ]);
    }

    cover.querySelectorAll<HTMLElement>('.mag-coverline-link').forEach((link, idx) => {
      const textKey = link.dataset.textKey || `cover:line:${idx}`;
      attachOverlayCluster(link, [
        makeMoveBtn(`coverline ${idx + 1}`),
        makeActionBtn('edit', `Edit coverline ${idx + 1}`, 'edit-text-override', { 'target-text-key': textKey }),
        makeActionBtn('delete', `Remove coverline ${idx + 1}`, 'delete-text-override', { 'target-text-key': textKey }),
      ]);
    });

    const heroActions = cover.querySelector<HTMLElement>('#hero-actions');
    if (heroActions) {
      Array.from(heroActions.querySelectorAll<HTMLElement>(':scope > a')).forEach((link, idx) => {
        const chip = document.createElement('span');
        chip.className = 'admin-inline-chip';
        link.replaceWith(chip);
        chip.append(link);
        attachOverlayCluster(chip, [
          makeMoveBtn(`button ${idx + 1}`),
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
    ]);
    attachTextAndHeadControls(metricsPage, 'metrics', 'edit-metrics-header', 'metrics');

    metricsPage
      .querySelectorAll<HTMLElement>('#ticker-track > li:not([aria-hidden="true"])')
      .forEach((li, idx) => {
        li.classList.add('admin-ticker-chip');
        attachOverlayCluster(li, [
          makeActionBtn('edit', `Edit ticker ${idx + 1}`, 'edit-ticker', { idx }),
          makeActionBtn('delete', `Delete ticker ${idx + 1}`, 'delete-ticker', { idx }),
        ]);
      });

    metricsPage.querySelectorAll<HTMLElement>('#metrics-list > li').forEach((li, idx) => {
      attachOverlayCluster(li, [
        makeMoveBtn(`metric ${idx + 1}`),
        makeActionBtn('edit', `Edit metric ${idx + 1}`, 'edit-metric', { idx }),
        makeActionBtn('delete', `Delete metric ${idx + 1}`, 'delete-metric', { idx }),
      ]);
    });
  }

  // 3. Work (#work & #work-2)
  const workPage = stageRoot.querySelector<HTMLElement>('#work');
  if (workPage) {
    attachPageToolbar(workPage, [
      makeActionBtn('add', 'Add case study', 'add-case', {}, 'Case'),
      makeActionBtn('add', 'Add sticker or image to Work I', 'add-page-photo', { page: 'work' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Work I', 'add-page-text', { page: 'work' }, 'Text'),
    ]);
    attachTextAndHeadControls(workPage, 'work', 'edit-work-header', 'work');
  }
  const workPage2 = stageRoot.querySelector<HTMLElement>('#work-2');
  if (workPage2) {
    attachPageToolbar(workPage2, [
      makeActionBtn('add', 'Add case study', 'add-case', {}, 'Case'),
      makeActionBtn('add', 'Add sticker or image to Work II', 'add-page-photo', { page: 'work-2' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Work II', 'add-page-text', { page: 'work-2' }, 'Text'),
    ]);
    attachTextAndHeadControls(workPage2, 'work-2', 'edit-work-header', null);
  }
  stageRoot.querySelectorAll<HTMLElement>('#work-grid > .case-card, #work-grid-2 > .case-card').forEach((card) => {
    const caseId = card.dataset.caseId;
    const idx = state.caseStudies.findIndex((c) => c.id === caseId);
    if (idx < 0) return;
    attachOverlayCluster(card, [
      makeMoveBtn('case card'),
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
      makeActionBtn('add', 'Add live campaign or event', 'add-campaign', {}, 'Event'),
      makeActionBtn('add', 'Add sticker or image to Events', 'add-page-photo', { page: 'events' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Events', 'add-page-text', { page: 'events' }, 'Text'),
    ]);
    attachTextAndHeadControls(eventsPage, 'events', 'edit-events-header', 'events');
    eventsPage.querySelectorAll<HTMLElement>('#events-grid > .event-card').forEach((card) => {
      const campId = card.dataset.campaignId;
      const idx = state.campaigns.findIndex((c) => c.id === campId);
      if (idx < 0) return;
      attachOverlayCluster(card, [
        makeMoveBtn('campaign card'),
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
      makeActionBtn('add', 'Add capability pillar', 'add-service', {}, 'Pillar'),
      makeActionBtn('add', 'Add sticker or image to Capabilities I', 'add-page-photo', { page: 'services' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Capabilities I', 'add-page-text', { page: 'services' }, 'Text'),
    ]);
    attachTextAndHeadControls(servicesPage, 'services', 'edit-services-header', 'services');
    servicesPage.querySelectorAll<HTMLElement>('#services-grid > .service-card').forEach((card, idx) => {
      attachOverlayCluster(card, [
        makeMoveBtn(`capability ${idx + 1}`),
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
    attachTextAndHeadControls(servicesPage2, 'services-2', 'edit-services-header', null);
    servicesPage2.querySelectorAll<HTMLElement>('#services-grid-2 > .service-card').forEach((card, offset) => {
      const idx = 2 + offset;
      attachOverlayCluster(card, [
        makeMoveBtn(`capability ${idx + 1}`),
        makeActionBtn('edit', `Edit capability ${idx + 1}`, 'edit-service', { idx }),
        makeActionBtn('delete', `Delete capability ${idx + 1}`, 'delete-service', { idx }),
      ]);
    });
  }

  // 6. Culture Lab (#culture-lab)
  const culturePage = stageRoot.querySelector<HTMLElement>('#culture-lab');
  if (culturePage) {
    attachPageToolbar(culturePage, [
      makeActionBtn('add', 'Add operating step', 'add-step', {}, 'Step'),
      makeActionBtn('add', 'Add sticker or image to Culture Lab', 'add-page-photo', { page: 'culture-lab' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Culture Lab', 'add-page-text', { page: 'culture-lab' }, 'Text'),
    ]);
    attachTextAndHeadControls(culturePage, 'culture-lab', 'edit-culture-header', 'culture-lab');
    const quote = culturePage.querySelector<HTMLElement>('.quote-block');
    if (quote) {
      attachOverlayCluster(quote, [
        makeMoveBtn('featured quote'),
        makeActionBtn('edit', 'Edit client quote', 'edit-quote'),
      ]);
    }
    culturePage.querySelectorAll<HTMLElement>('#process-grid > .process-card').forEach((card, idx) => {
      attachOverlayCluster(card, [
        makeMoveBtn(`step ${idx + 1}`),
        makeActionBtn('edit', `Edit step ${idx + 1}`, 'edit-step', { idx }),
        makeActionBtn('delete', `Delete step ${idx + 1}`, 'delete-step', { idx }),
      ]);
    });
  }

  // 7. FAQ (#faq & #faq-2)
  const faqPage = stageRoot.querySelector<HTMLElement>('#faq');
  if (faqPage) {
    attachPageToolbar(faqPage, [
      makeActionBtn('add', 'Add FAQ question', 'add-faq', {}, 'FAQ'),
      makeActionBtn('add', 'Add sticker or image to FAQ I', 'add-page-photo', { page: 'faq' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to FAQ I', 'add-page-text', { page: 'faq' }, 'Text'),
    ]);
    attachTextAndHeadControls(faqPage, 'faq', 'edit-faq-header', 'faq');
    faqPage.querySelectorAll<HTMLElement>('#faq-list > .faq-item').forEach((item, idx) => {
      attachOverlayCluster(item, [
        makeMoveBtn(`FAQ ${idx + 1}`),
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
    attachTextAndHeadControls(faqPage2, 'faq-2', 'edit-faq-header', null);
    faqPage2.querySelectorAll<HTMLElement>('#faq-list-2 > .faq-item').forEach((item, offset) => {
      const idx = 2 + offset;
      attachOverlayCluster(item, [
        makeMoveBtn(`FAQ ${idx + 1}`),
        makeActionBtn('edit', `Edit FAQ ${idx + 1}`, 'edit-faq', { idx }),
        makeActionBtn('delete', `Delete FAQ ${idx + 1}`, 'delete-faq', { idx }),
      ]);
    });
  }

  // 8. Brief & Directory (#brief, #directory)
  const briefPage = stageRoot.querySelector<HTMLElement>('#brief');
  if (briefPage) {
    attachPageToolbar(briefPage, [
      makeActionBtn('add', 'Add sticker or image to Brief', 'add-page-photo', { page: 'brief' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Brief', 'add-page-text', { page: 'brief' }, 'Text'),
    ]);
    attachTextAndHeadControls(briefPage, 'brief', 'edit-brief-header', 'brief');
  }
  const dirPage = stageRoot.querySelector<HTMLElement>('#directory');
  if (dirPage) {
    attachPageToolbar(dirPage, [
      makeActionBtn('add', 'Add sticker or image to Directory', 'add-page-photo', { page: 'directory' }, 'Sticker'),
      makeActionBtn('add', 'Add text column to Directory', 'add-page-text', { page: 'directory' }, 'Text'),
    ]);
    attachTextAndHeadControls(dirPage, 'directory', 'edit-directory-header', null);
  }

  // 9. Custom Pages
  stageRoot.querySelectorAll<HTMLElement>('[data-custom-section]').forEach((pageEl, sIdx) => {
    const secId = pageEl.dataset.customSection || '';
    const pageKey = `custom-${secId}`;
    attachPageToolbar(pageEl, [
      makeActionBtn('add', 'Add text card', 'add-custom-el', { 's-idx': sIdx, kind: 'text' }, 'Text'),
      makeActionBtn('add', 'Add CTA button', 'add-custom-el', { 's-idx': sIdx, kind: 'button' }, 'Btn'),
      makeActionBtn('add', 'Add TikTok/Instagram link', 'add-custom-el', { 's-idx': sIdx, kind: 'reference' }, 'Link'),
      makeActionBtn('add', 'Add sticker or image', 'add-page-photo', { page: pageKey, 'c-idx': sIdx }, 'Sticker'),
    ]);
    attachTextAndHeadControls(
      pageEl,
      pageKey,
      'edit-custom-section',
      null,
      { 's-idx': sIdx },
      sIdx,
    );
    pageEl.querySelectorAll<HTMLElement>('.custom-elements-grid > *').forEach((card, eIdx) => {
      attachOverlayCluster(card, [
        makeMoveBtn('custom element'),
        makeActionBtn('edit', 'Edit element', 'edit-custom-el', { 's-idx': sIdx, 'e-idx': eIdx }),
        makeActionBtn('delete', 'Delete element', 'delete-custom-el', { 's-idx': sIdx, 'e-idx': eIdx }),
      ]);
    });
  });

  // 10. Floating cutout stickers on ALL interior pages — Move, Pen, Bin ON every figure
  stageRoot.querySelectorAll<HTMLElement>('[data-page-photos]').forEach((container) => {
    const pageKey = container.dataset.pagePhotos;
    if (!pageKey || pageKey === 'cover') return;
    container.querySelectorAll<HTMLElement>(':scope > .mag-photo-figure').forEach((fig, idx) => {
      attachOverlayCluster(
        fig,
        [
          makeMoveBtn(`sticker ${idx + 1} on ${pageKey}`),
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

  // 11. Sidebar Note Cutout Stickers — wrap <img> directly so icons sit ON the sticker itself
  stageRoot.querySelectorAll<HTMLImageElement>('[data-page-note-cutout]').forEach((img) => {
    const pageKey = img.dataset.pageNoteCutout;
    const box = img.closest<HTMLElement>('.mag-note-box');
    if (!pageKey || !box) return;
    const noteKey = `note-${pageKey}`;

    const host = document.createElement('span');
    host.className = img.hidden ? 'mag-note-cutout-host is-empty-cutout' : 'mag-note-cutout-host';
    host.dataset.layoutKey = `note:${pageKey}:sticker`;
    img.replaceWith(host);
    host.append(img);

    if (img.hidden) {
      attachOverlayCluster(
        host,
        [
          makeActionBtn('add', `Add note sticker on ${pageKey}`, 'add-page-photo', {
            page: noteKey,
          }),
        ],
        'is-note-sticker-controls',
      );
    } else {
      attachOverlayCluster(
        host,
        [
          makeMoveBtn(`sidebar sticker on ${pageKey}`),
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

  // 12. Right-column Trio Editorial Photos — wrap each photo so Move/Pen/Bin sit directly ON each thumbnail
  stageRoot.querySelectorAll<HTMLElement>('.mag-ref-mini-trio').forEach((trio) => {
    const parentPageEl = trio.closest<HTMLElement>('[data-mag-page]');
    const pageKey = trio.dataset.pageTrio || parentPageEl?.dataset.magPage || '';
    if (!pageKey) return;
    const trioKey = `trio-${pageKey}`;
    const imgs = Array.from(trio.querySelectorAll<HTMLImageElement>(':scope > img'));
    if (trio.hidden || imgs.length === 0) {
      const rightCol = trio.closest<HTMLElement>('.mag-ref-right-col');
      if (rightCol && !rightCol.querySelector(`[data-action="add-page-photo"][data-page="${trioKey}"]`)) {
        const restoreWrap = document.createElement('div');
        restoreWrap.style.display = 'flex';
        restoreWrap.style.justifyContent = 'flex-end';
        restoreWrap.append(
          makeActionBtn('add', `Add photo to ${pageKey} strip`, 'add-page-photo', { page: trioKey }, 'Strip Photo'),
        );
        rightCol.prepend(restoreWrap);
      }
      return;
    }

    imgs.forEach((img, idx) => {
      const slot = document.createElement('figure');
      slot.className = 'mag-trio-slot';
      slot.dataset.layoutKey = `trio:${pageKey}:${idx}`;
      img.replaceWith(slot);
      slot.append(img);
      attachOverlayCluster(slot, [
        makeMoveBtn(`strip photo ${idx + 1} on ${pageKey}`),
        makeActionBtn('edit', `Replace strip photo ${idx + 1} on ${pageKey}`, 'edit-page-photo', {
          page: trioKey,
          idx,
        }),
        makeActionBtn('delete', `Remove strip photo ${idx + 1} from ${pageKey}`, 'delete-page-photo', {
          page: trioKey,
          idx,
        }),
      ]);
    });
  });

  // 13. Extra custom text blocks
  stageRoot.querySelectorAll<HTMLElement>('[data-page-texts]').forEach((container) => {
    const pageKey = container.dataset.pageTexts;
    if (!pageKey) return;
    Array.from(container.children).forEach((child, idx) => {
      if (!(child instanceof HTMLElement)) return;
      attachOverlayCluster(child, [
        makeMoveBtn(`extra text block ${idx + 1}`),
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

  assignEditableLayoutKeys(stageRoot);
}

export interface AdminCloneHandle {
  controller: MagazineBookController | null;
  reposition: RepositionController | null;
  destroy: () => void;
}

export function mountAdminMagazineClone(
  hostContainer: HTMLElement,
  state: AdminMagazineState,
  onAction: (target: HTMLElement) => void,
  initialPageId?: string,
  onCommitLayout?: (layoutKey: string, layout: ElementLayout | null) => Promise<void>,
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

  const stageTop = Math.max(0, Math.round(stage.getBoundingClientRect?.().top ?? 0));
  if (stageTop > 0) {
    stage.style.setProperty('--admin-stage-top', `${stageTop}px`);
  }

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
  applyTextOverrides(stage, state.textOverrides);

  // Inject zero-flow Move, Pen, Bin & Add overlays BEFORE paginating so they travel with continuation pages
  injectAdminControls(stage, state);
  applyElementLayouts(stage, state.elementLayouts);

  const briefCtrl = initBriefForm(stage);
  const controller = initMagazineBook(stage);

  if (initialPageId && controller) {
    controller.goToPageById(initialPageId, true);
  }

  const mountedBook = stage.querySelector<HTMLElement>('#mag-book');
  const reposition = mountedBook
    ? createRepositionController(
        stage,
        mountedBook,
        (key) => state.elementLayouts?.[key],
        async (key, layout) => {
          if (onCommitLayout) await onCommitLayout(key, layout);
        },
      )
    : null;

  const handleActionClick = (e: Event) => {
    const actionEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!actionEl) return;
    e.preventDefault();
    e.stopPropagation();

    if (actionEl.dataset.action === 'toggle-reposition') {
      const targetEl = actionEl.closest<HTMLElement>('[data-layout-key]');
      const layoutKey = targetEl?.dataset.layoutKey;
      if (targetEl && layoutKey && reposition) {
        reposition.toggle(
          targetEl,
          layoutKey,
          actionEl.getAttribute('aria-label')?.replace(/^Reposition or pinch-resize\s+/i, '') ||
            'Element',
        );
      }
      return;
    }

    onAction(actionEl);
  };

  stage.addEventListener('click', handleActionClick, true);

  return {
    controller,
    reposition,
    destroy: () => {
      stage.removeEventListener('click', handleActionClick, true);
      reposition?.destroy();
      briefCtrl?.destroy();
      controller?.destroy();
    },
  };
}
