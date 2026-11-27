import {
  AGENCY_METRICS,
  CASE_STUDIES,
  DEFAULT_CAMPAIGNS,
  DEFAULT_HERO_BUTTONS,
  DEFAULT_PAGE_PHOTOS,
  DEFAULT_PAGE_TEXT_BLOCKS,
  DEFAULT_SITE_CONTENT,
  FAQ_ITEMS,
  PROCESS_STEPS,
  SERVICE_PILLARS,
  TICKER_ITEMS,
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

    let layoutChanged = false;
    const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

    if (Array.isArray(data.heroButtons) && !sameJson(data.heroButtons, DEFAULT_HERO_BUTTONS)) {
      renderHeroButtons(root.querySelector('#hero-actions'), data.heroButtons);
      layoutChanged = true;
    }
    if (data.siteContent && !sameJson({ ...DEFAULT_SITE_CONTENT, ...data.siteContent }, DEFAULT_SITE_CONTENT)) {
      applySiteContent(root, data.siteContent);
      layoutChanged = true;
    }
    if (Array.isArray(data.metrics) && !sameJson(data.metrics, AGENCY_METRICS)) {
      renderMetrics(root.querySelector('#metrics-list'), data.metrics);
      layoutChanged = true;
    }
    if (Array.isArray(data.tickerItems) && !sameJson(data.tickerItems, TICKER_ITEMS)) {
      renderTicker(root.querySelector('#ticker-track'), data.tickerItems);
      layoutChanged = true;
    }
    if (Array.isArray(data.caseStudies) && !sameJson(data.caseStudies, CASE_STUDIES)) {
      workController.updateStudies(data.caseStudies);
      layoutChanged = true;
    }
    if (Array.isArray(data.campaigns) && !sameJson(data.campaigns, DEFAULT_CAMPAIGNS)) {
      renderCampaigns(root.querySelector('#events-grid'), data.campaigns);
      layoutChanged = true;
    }
    if (Array.isArray(data.services) && !sameJson(data.services, SERVICE_PILLARS)) {
      renderServices(
        root.querySelector('#services-grid'),
        data.services,
        root.querySelector<HTMLElement>('#services-grid-2'),
      );
      layoutChanged = true;
    }
    if (Array.isArray(data.processSteps) && !sameJson(data.processSteps, PROCESS_STEPS)) {
      renderProcessSteps(root.querySelector('#process-grid'), data.processSteps);
      layoutChanged = true;
    }
    if (Array.isArray(data.faqs) && !sameJson(data.faqs, FAQ_ITEMS)) {
      initFaq(
        root.querySelector('#faq-list'),
        data.faqs,
        root.querySelector<HTMLElement>('#faq-list-2'),
      );
      layoutChanged = true;
    }
    if (Array.isArray(data.customSections) && data.customSections.length > 0) {
      renderCustomSections(
        root.querySelector('#custom-sections-root'),
        data.customSections,
        data.pagePhotos,
        data.pageTextBlocks,
      );
      layoutChanged = true;
    }
    if (data.pagePhotos && !sameJson(data.pagePhotos, DEFAULT_PAGE_PHOTOS)) {
      renderPagePhotos(root, data.pagePhotos);
      layoutChanged = true;
    }
    if (data.pageTextBlocks && !sameJson(data.pageTextBlocks, DEFAULT_PAGE_TEXT_BLOCKS)) {
      renderPageTextBlocks(root, data.pageTextBlocks);
      layoutChanged = true;
    }
    if (Array.isArray(data.hiddenSections) && data.hiddenSections.length > 0) {
      applyHiddenSections(root, data.hiddenSections);
      layoutChanged = true;
    }

    if (layoutChanged) {
      const decodeTasks = Array.from(root.querySelectorAll<HTMLImageElement>('#mag-book img')).map(
        (img) => {
          img.loading = 'eager';
          return img.decode?.().catch(() => {}) ?? Promise.resolve();
        },
      );
      await Promise.race([
        Promise.allSettled(decodeTasks),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
      bookController?.refresh();
    }
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
