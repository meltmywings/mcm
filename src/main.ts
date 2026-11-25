import { AGENCY_METRICS, PROCESS_STEPS, SERVICE_PILLARS } from './data/agency';
import { initFaq } from './scripts/faq';
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
  initWorkSection(root);
  initFaq(root.querySelector<HTMLElement>('#faq-list'));
  initBriefForm(root);
  initScrollRevealFallback(root);

  const yearEl = root.querySelector<HTMLElement>('#copyright-year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

if (typeof document !== 'undefined') {
  void bootstrapApp(document);
}

