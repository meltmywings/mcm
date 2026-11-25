import type { CampaignEvent, SiteContent } from '../data/agency';

function safeHref(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '#brief';
}

export function renderCampaigns(grid: HTMLElement | null, campaigns: readonly CampaignEvent[]): void {
  if (!grid) return;

  const active = campaigns.filter((item) => item.isActive);
  if (active.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'event-card';

    const tag = document.createElement('span');
    tag.className = 'case-tag';
    tag.textContent = 'Stay Tuned';

    const title = document.createElement('h3');
    title.className = 'case-client';
    title.textContent = 'New Campaigns Announcing Soon';

    const desc = document.createElement('p');
    desc.className = 'case-summary';
    desc.textContent = 'Submit a brief below to pitch a bespoke launch or reserve a creator salon spot.';

    empty.append(tag, title, desc);
    grid.replaceChildren(empty);
    return;
  }

  grid.replaceChildren(
    ...active.map((item) => {
      const li = document.createElement('li');
      li.className = 'event-card reveal-card';
      li.dataset.campaignId = item.id;

      const body = document.createElement('div');
      const meta = document.createElement('div');
      meta.className = 'case-meta';

      const kind = document.createElement('span');
      kind.className = 'case-tag';
      kind.textContent = item.kind;

      const loc = document.createElement('span');
      loc.className = 'case-sector';
      loc.textContent = `${item.dateLabel} · ${item.location}`;
      meta.append(kind, loc);

      const title = document.createElement('h3');
      title.className = 'case-client';
      title.textContent = item.title;

      const summary = document.createElement('p');
      summary.className = 'case-summary';
      summary.textContent = item.description;

      body.append(meta, title, summary);

      const ctaWrap = document.createElement('div');
      ctaWrap.style.marginBlockStart = '1.25rem';

      const cta = document.createElement('a');
      cta.className = 'btn btn-secondary';
      cta.href = safeHref(item.ctaHref);
      cta.textContent = item.ctaLabel;
      ctaWrap.append(cta);

      li.append(body, ctaWrap);
      return li;
    }),
  );
}

export function applySiteContent(root: ParentNode, content: Partial<SiteContent>): void {
  const setText = (selector: string, value: string | undefined) => {
    if (!value) return;
    const el = root.querySelector<HTMLElement>(selector);
    if (el) el.textContent = value;
  };

  setText('#main-heading', content.brandTitle);
  setText('#hero-brand-subtitle', content.brandSubtitle);
  setText('#hero-primary-cta', content.primaryCtaLabel);
  setText('#hero-secondary-cta', content.secondaryCtaLabel);
  setText('#work-heading', content.workHeading);
  setText('#work-subtitle', content.workSubtitle);
  setText('#services-heading', content.servicesHeading);
  setText('#culture-quote-text', content.cultureQuote);
  setText('#culture-quote-author', content.cultureQuoteAuthor);
}

