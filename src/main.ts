import {
  AGENCY_METRICS,
  CASE_STUDIES,
  DEFAULT_CAMPAIGNS,
  PROCESS_STEPS,
  SERVICE_PILLARS,
  type CampaignEvent,
  type CaseStudy,
  type SiteContent,
} from './data/agency';
import { initFaq } from './scripts/faq';
import { applySiteContent, renderCampaigns } from './scripts/cmsView';
import { initBriefForm } from './scripts/form';
import { initMagazineCollage } from './scripts/magazines';
import { initScrollRevealFallback, initTickerToggle, renderTicker } from './scripts/motion';
import { ensurePopoverPolyfill, initNavbar } from './scripts/navbar';
import { initWorkSection } from './scripts/work';

function renderStaticSections(root: ParentNode = document): void {
  const metricsList = root.querySelector<HTMLElement>('#metrics-list');
  if (metricsList) {
    metricsList.replaceChildren(
      ...AGENCY_METRICS.map((metric) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="metric-value">${metric.value}</span>
          <span class="metric-label">${metric.label}</span>
        `;
        return li;
      }),
    );
  }

  const servicesGrid = root.querySelector<HTMLElement>('#services-grid');
  if (servicesGrid) {
    servicesGrid.replaceChildren(
      ...SERVICE_PILLARS.map((pillar) => {
        const li = document.createElement('li');
        li.className = 'service-card reveal-card';
        li.innerHTML = `
          <span class="service-number">${pillar.number}</span>
          <h3 class="service-title">${pillar.title}</h3>
          <p class="service-tagline">${pillar.tagline}</p>
          <p class="service-desc">${pillar.description}</p>
          <ul class="service-outcomes">
            ${pillar.outcomes.map((outcome) => `<li>${outcome}</li>`).join('')}
          </ul>
        `;
        return li;
      }),
    );
  }

  const processGrid = root.querySelector<HTMLElement>('#process-grid');
  if (processGrid) {
    processGrid.replaceChildren(
      ...PROCESS_STEPS.map((item) => {
        const li = document.createElement('li');
        li.className = 'process-card reveal-card';
        li.innerHTML = `
          <span class="process-step">${item.step}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        `;
        return li;
      }),
    );
  }
}

async function hydrateFromCms(
  root: ParentNode,
  workController: { updateStudies: (studies: readonly CaseStudy[]) => void },
): Promise<void> {
  if (typeof fetch !== 'function') return;
  try {
    const res = await fetch('/api/cms', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as {
      siteContent?: Partial<SiteContent>;
      caseStudies?: CaseStudy[];
      campaigns?: CampaignEvent[];
    };

    if (data.siteContent) applySiteContent(root, data.siteContent);
    if (Array.isArray(data.caseStudies) && data.caseStudies.length > 0) {
      workController.updateStudies(data.caseStudies);
    }
    if (Array.isArray(data.campaigns)) {
      renderCampaigns(root.querySelector('#events-grid'), data.campaigns);
    }
  } catch {
    // Keep default seeded content when running offline
  }
}

export async function bootstrapApp(root: ParentNode = document): Promise<void> {
  await ensurePopoverPolyfill();

  renderStaticSections(root);
  initMagazineCollage(root);
  renderTicker(root.querySelector('#ticker-track'));
  initTickerToggle(
    root.querySelector<HTMLButtonElement>('#ticker-toggle'),
    root.querySelector<HTMLElement>('#ticker-track'),
  );

  initNavbar(root.querySelector<HTMLElement>('#site-header'));
  const workController = initWorkSection(root, CASE_STUDIES);
  renderCampaigns(root.querySelector('#events-grid'), DEFAULT_CAMPAIGNS);
  initFaq(root.querySelector<HTMLElement>('#faq-list'));
  initBriefForm(root);
  initScrollRevealFallback(root);

  const yearEl = root.querySelector<HTMLElement>('#copyright-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  void hydrateFromCms(root, workController);
}

if (typeof document !== 'undefined') {
  void bootstrapApp(document);
}
