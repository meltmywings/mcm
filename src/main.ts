import {
  AGENCY_METRICS,
  CASE_STUDIES,
  DEFAULT_CAMPAIGNS,
  DEFAULT_HERO_BUTTONS,
  DEFAULT_PAGE_PHOTOS,
  DEFAULT_PAGE_TEXT_BLOCKS,
  PROCESS_STEPS,
  SERVICE_PILLARS,
  type BuiltinSectionKey,
  type CampaignEvent,
  type CaseStudy,
  type CustomSection,
  type FaqItem,
  type HeroButton,
  type MagazinePhoto,
  type MetricItem,
  type PageTextBlock,
  type ProcessStep,
  type ServicePillar,
  type SiteContent,
} from './data/agency';
import { initFaq } from './scripts/faq';
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
} from './scripts/cmsView';
import { initBriefForm } from './scripts/form';
import { initInstallPrompt, registerAppServiceWorker } from './scripts/install';
import { initMagazineBook, type MagazineBookController } from './scripts/magazineBook';
import { initScrollRevealFallback, initTickerToggle, renderTicker } from './scripts/motion';
import { ensurePopoverPolyfill, initNavbar } from './scripts/navbar';
import { initWorkSection } from './scripts/work';

function renderStaticSections(root: ParentNode = document): void {
  renderHeroButtons(root.querySelector<HTMLElement>('#hero-actions'), DEFAULT_HERO_BUTTONS);
  renderMetrics(root.querySelector<HTMLElement>('#metrics-list'), AGENCY_METRICS);
  renderServices(
    root.querySelector<HTMLElement>('#services-grid'),
    SERVICE_PILLARS,
    root.querySelector<HTMLElement>('#services-grid-2'),
  );
  renderProcessSteps(root.querySelector<HTMLElement>('#process-grid'), PROCESS_STEPS);
  renderPagePhotos(root, DEFAULT_PAGE_PHOTOS);
  renderPageTextBlocks(root, DEFAULT_PAGE_TEXT_BLOCKS);
}

async function hydrateFromCms(
  root: ParentNode,
  workController: { updateStudies: (studies: readonly CaseStudy[]) => void },
  bookController: MagazineBookController | null,
): Promise<void> {
  if (typeof fetch !== 'function') return;
  try {
    const res = await fetch('/api/cms', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as {
      siteContent?: Partial<SiteContent>;
      heroButtons?: HeroButton[];
      metrics?: MetricItem[];
      tickerItems?: string[];
      caseStudies?: CaseStudy[];
      campaigns?: CampaignEvent[];
      services?: ServicePillar[];
      processSteps?: ProcessStep[];
      faqs?: FaqItem[];
      customSections?: CustomSection[];
      hiddenSections?: BuiltinSectionKey[];
      pagePhotos?: Record<string, MagazinePhoto[]>;
      pageTextBlocks?: Record<string, PageTextBlock[]>;
    };

    if (Array.isArray(data.heroButtons)) {
      renderHeroButtons(root.querySelector('#hero-actions'), data.heroButtons);
    }
    if (data.siteContent) applySiteContent(root, data.siteContent);
    if (Array.isArray(data.metrics)) {
      renderMetrics(root.querySelector('#metrics-list'), data.metrics);
    }
    if (Array.isArray(data.tickerItems)) {
      renderTicker(root.querySelector('#ticker-track'), data.tickerItems);
    }
    if (Array.isArray(data.caseStudies)) {
      workController.updateStudies(data.caseStudies);
    }
    if (Array.isArray(data.campaigns)) {
      renderCampaigns(root.querySelector('#events-grid'), data.campaigns);
    }
    if (Array.isArray(data.services)) {
      renderServices(
        root.querySelector('#services-grid'),
        data.services,
        root.querySelector<HTMLElement>('#services-grid-2'),
      );
    }
    if (Array.isArray(data.processSteps)) {
      renderProcessSteps(root.querySelector('#process-grid'), data.processSteps);
    }
    if (Array.isArray(data.faqs)) {
      initFaq(
        root.querySelector('#faq-list'),
        data.faqs,
        root.querySelector<HTMLElement>('#faq-list-2'),
      );
    }
    if (Array.isArray(data.customSections)) {
      renderCustomSections(
        root.querySelector('#custom-sections-root'),
        data.customSections,
        data.pagePhotos,
        data.pageTextBlocks,
      );
    }
    if (data.pagePhotos) {
      renderPagePhotos(root, data.pagePhotos);
    }
    if (data.pageTextBlocks) {
      renderPageTextBlocks(root, data.pageTextBlocks);
    }
    if (Array.isArray(data.hiddenSections)) {
      applyHiddenSections(root, data.hiddenSections);
    }

    bookController?.refresh();
  } catch {
    // Keep default seeded content when running offline
  }
}

export async function bootstrapApp(root: ParentNode = document): Promise<void> {
  await ensurePopoverPolyfill();

  renderStaticSections(root);
  renderTicker(root.querySelector('#ticker-track'));
  initTickerToggle(
    root.querySelector<HTMLButtonElement>('#ticker-toggle'),
    root.querySelector<HTMLElement>('#ticker-track'),
  );

  initNavbar(root.querySelector<HTMLElement>('#site-header'));
  const workController = initWorkSection(root, CASE_STUDIES);
  renderCampaigns(root.querySelector('#events-grid'), DEFAULT_CAMPAIGNS);
  initFaq(
    root.querySelector<HTMLElement>('#faq-list'),
    undefined,
    root.querySelector<HTMLElement>('#faq-list-2'),
  );
  initBriefForm(root);
  initScrollRevealFallback(root);
  initInstallPrompt(root);
  registerAppServiceWorker();

  const bookController = initMagazineBook(root);

  const yearEl = root.querySelector<HTMLElement>('#copyright-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  void hydrateFromCms(root, workController, bookController);
}

if (typeof document !== 'undefined') {
  void bootstrapApp(document);
}
