import type {
  BuiltinSectionKey,
  CampaignEvent,
  CustomSection,
  HeroButton,
  MagazinePhoto,
  MediaPlatform,
  MediaReference,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
} from '../data/agency';
import { getCutoutShapeOutside } from '../data/cutoutShapes';

export function safeHref(raw: string, fallback = '#brief'): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function safeImageSrc(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

export function formatPlatformLabel(platform: MediaPlatform): string {
  switch (platform) {
    case 'tiktok':
      return 'TikTok';
    case 'instagram':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    default:
      return 'Reference';
  }
}

export function createReferenceLinksElement(references?: readonly MediaReference[]): HTMLElement | null {
  if (!references || references.length === 0) return null;

  const wrap = document.createElement('div');
  wrap.className = 'ref-links';

  for (const ref of references) {
    const link = document.createElement('a');
    link.className = 'ref-pill';
    link.href = safeHref(ref.url, '#work');
    if (/^https?:\/\//i.test(link.href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    const badge = document.createElement('span');
    badge.className = 'ref-platform';
    badge.textContent = formatPlatformLabel(ref.platform);

    const text = document.createElement('span');
    text.textContent = ref.handle ? `${ref.label} (${ref.handle}) ↗` : `${ref.label} ↗`;

    link.append(badge, text);
    wrap.append(link);
  }

  return wrap;
}

export function renderHeroButtons(
  container: HTMLElement | null,
  buttons: readonly HeroButton[],
): void {
  if (!container) return;

  const installBtn = container.querySelector<HTMLButtonElement>('#install-app-btn');
  const nodes = buttons.map((btn, index) => {
    const link = document.createElement('a');
    if (index === 0) link.id = 'hero-primary-cta';
    else if (index === 1) link.id = 'hero-secondary-cta';
    link.className = btn.variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';
    link.href = safeHref(btn.href, '#brief');
    if (/^https?:\/\//i.test(link.href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.textContent = btn.label;
    return link;
  });

  if (installBtn) {
    container.replaceChildren(...nodes, installBtn);
  } else {
    container.replaceChildren(...nodes);
  }
}

export function renderMetrics(
  container: HTMLElement | null,
  metrics: readonly MetricItem[],
): void {
  if (!container) return;

  container.replaceChildren(
    ...metrics.map((metric) => {
      const li = document.createElement('li');
      const val = document.createElement('span');
      val.className = 'metric-value';
      val.textContent = metric.value;
      const lbl = document.createElement('span');
      lbl.className = 'metric-label';
      lbl.textContent = metric.label;
      li.append(val, lbl);
      return li;
    }),
  );
}

function buildServiceNodes(services: readonly ServicePillar[]): HTMLElement[] {
  return services.map((pillar) => {
    const li = document.createElement('li');
    li.className = 'service-card reveal-card';

    const num = document.createElement('span');
    num.className = 'service-number';
    num.textContent = pillar.number;

    const title = document.createElement('h3');
    title.className = 'service-title';
    title.textContent = pillar.title;

    const tagline = document.createElement('p');
    tagline.className = 'service-tagline';
    tagline.textContent = pillar.tagline;

    const desc = document.createElement('p');
    desc.className = 'service-desc';
    desc.textContent = pillar.description;

    const outcomes = document.createElement('ul');
    outcomes.className = 'service-outcomes';
    for (const item of pillar.outcomes) {
      const outcomeLi = document.createElement('li');
      outcomeLi.textContent = item;
      outcomes.append(outcomeLi);
    }

    li.append(num, title, tagline, desc, outcomes);
    return li;
  });
}

export function renderServices(
  container: HTMLElement | null,
  services: readonly ServicePillar[],
  container2?: HTMLElement | null,
): void {
  if (!container) return;

  if (container2) {
    container.replaceChildren(...buildServiceNodes(services.slice(0, 2)));
    container2.replaceChildren(...buildServiceNodes(services.slice(2)));
    return;
  }

  container.replaceChildren(...buildServiceNodes(services));
}

export function renderProcessSteps(
  container: HTMLElement | null,
  steps: readonly ProcessStep[],
): void {
  if (!container) return;

  container.replaceChildren(
    ...steps.map((item) => {
      const li = document.createElement('li');
      li.className = 'process-card reveal-card';

      const stepEl = document.createElement('span');
      stepEl.className = 'process-step';
      stepEl.textContent = item.step;

      const title = document.createElement('h3');
      title.textContent = item.title;

      const desc = document.createElement('p');
      desc.textContent = item.description;

      li.append(stepEl, title, desc);
      return li;
    }),
  );
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
      meta.append(kind, ' · ', loc);

      const title = document.createElement('h3');
      title.className = 'case-client';
      title.textContent = item.title;

      const summary = document.createElement('p');
      summary.className = 'case-summary';
      summary.textContent = item.description;

      body.append(meta, title, summary);

      const refsEl = createReferenceLinksElement(item.references);
      if (refsEl) {
        body.append(refsEl);
      }

      const ctaWrap = document.createElement('div');
      ctaWrap.style.marginBlockStart = '0.3rem';

      const cta = document.createElement('a');
      cta.className = 'btn btn-secondary';
      cta.href = safeHref(item.ctaHref);
      if (/^https?:\/\//i.test(cta.href)) {
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer';
      }
      cta.textContent = item.ctaLabel;
      ctaWrap.append(cta);

      li.append(body, ctaWrap);
      return li;
    }),
  );
}

const CUSTOM_PAGE_PHOTOS = [
  '/magazines/cutouts/mag-08.png',
  '/magazines/cutouts/mag-09.png',
  '/magazines/cutouts/mag-10.png',
  '/magazines/cutouts/mag-11.png',
  '/magazines/cutouts/mag-13.png',
  '/magazines/cutouts/mag-15.png',
];

const CUTOUT_DIMENSIONS: Record<string, [number, number]> = {
  '/magazines/cutouts/mag-01.png': [688, 1032],
  '/magazines/cutouts/mag-02.png': [337, 651],
  '/magazines/cutouts/mag-03.png': [908, 1016],
  '/magazines/cutouts/mag-04.png': [908, 608],
  '/magazines/cutouts/mag-05.png': [564, 1019],
  '/magazines/cutouts/mag-06.png': [240, 574],
  '/magazines/cutouts/mag-07.png': [155, 513],
  '/magazines/cutouts/mag-08.png': [716, 691],
  '/magazines/cutouts/mag-09.png': [475, 676],
  '/magazines/cutouts/mag-10.png': [596, 490],
  '/magazines/cutouts/mag-11.png': [480, 413],
  '/magazines/cutouts/mag-12.png': [446, 804],
  '/magazines/cutouts/mag-13.png': [257, 594],
  '/magazines/cutouts/mag-14.png': [486, 1032],
  '/magazines/cutouts/mag-15.png': [747, 680],
};

function buildPhotoFigure(photo: MagazinePhoto, isCover: boolean, index = 0): HTMLElement | null {
  const cleanSrc = safeImageSrc(photo.src);
  if (!cleanSrc) return null;

  const figure = document.createElement('figure');
  figure.className = isCover ? 'mag-photo-figure is-cover-photo' : 'mag-photo-figure';
  if (!isCover) {
    // Odd positions (1st, 3rd -> idx 0, 2) float right; even positions (2nd, 4th -> idx 1, 3) float left
    const floatSide = index % 2 === 0 ? 'right' : 'left';
    figure.style.shapeOutside = getCutoutShapeOutside(cleanSrc, floatSide);
    figure.style.shapeMargin = '6px';
  }

  const img = document.createElement('img');
  img.src = cleanSrc;
  const dims = CUTOUT_DIMENSIONS[cleanSrc];
  if (dims) {
    img.width = dims[0];
    img.height = dims[1];
  }
  img.alt = '';
  img.className = 'mag-photo-img';
  img.decoding = 'async';
  figure.append(img);

  if (!isCover && photo.caption) {
    const cap = document.createElement('figcaption');
    cap.className = 'mag-photo-caption visually-hidden';
    cap.textContent = photo.caption;
    figure.append(cap);
  }
  return figure;
}

export function renderPagePhotos(
  root: ParentNode,
  pagePhotos: Record<string, readonly MagazinePhoto[]>,
): void {
  root.querySelectorAll<HTMLElement>('[data-page-photos]').forEach((container) => {
    const pageKey = container.dataset.pagePhotos;
    if (!pageKey || !Object.prototype.hasOwnProperty.call(pagePhotos, pageKey)) return;

    const items = pagePhotos[pageKey] ?? [];
    const isCover = pageKey === 'cover';
    const figures = (isCover ? items.slice(0, 1) : items)
      .map((photo, index) => buildPhotoFigure(photo, isCover, index))
      .filter((el): el is HTMLElement => el !== null);

    container.replaceChildren(...figures);

    const spread = container.closest<HTMLElement>('.mag-spread');
    if (spread) {
      spread.classList.toggle('no-photos', figures.length === 0);
    }
  });

  root.querySelectorAll<HTMLImageElement>('[data-page-note-cutout]').forEach((img) => {
    const key = `note-${img.dataset.pageNoteCutout}`;
    if (!Object.prototype.hasOwnProperty.call(pagePhotos, key)) return;
    const item = pagePhotos[key]?.[0];
    const clean = item ? safeImageSrc(item.src) : '';
    if (!clean) {
      img.hidden = true;
      return;
    }
    img.hidden = false;
    img.src = clean;
    const dims = CUTOUT_DIMENSIONS[clean];
    if (dims) {
      img.width = dims[0];
      img.height = dims[1];
    } else {
      img.removeAttribute('width');
      img.removeAttribute('height');
    }
    img.style.shapeOutside = getCutoutShapeOutside(clean, 'right');
  });
}

function buildTextBlockNode(block: PageTextBlock): HTMLElement {
  if (block.style === 'pullquote') {
    const fig = document.createElement('figure');
    fig.className = 'quote-block';
    const bq = document.createElement('blockquote');
    bq.className = 'quote-text';
    bq.textContent = block.body;
    fig.append(bq);
    if (block.title) {
      const cap = document.createElement('figcaption');
      cap.className = 'quote-cite';
      cap.textContent = block.title;
      fig.append(cap);
    }
    return fig;
  }

  const art = document.createElement('article');
  art.className = 'mag-extra-article';
  if (block.title) {
    const h3 = document.createElement('h3');
    h3.textContent = block.title;
    art.append(h3);
  }
  const p = document.createElement('p');
  p.textContent = block.body;
  art.append(p);
  return art;
}

export function renderPageTextBlocks(
  root: ParentNode,
  pageTextBlocks: Record<string, readonly PageTextBlock[]>,
): void {
  root.querySelectorAll<HTMLElement>('[data-page-texts]').forEach((container) => {
    const pageKey = container.dataset.pageTexts;
    if (!pageKey) return;
    const blocks = pageTextBlocks[pageKey] ?? [];
    container.replaceChildren(...blocks.map((b) => buildTextBlockNode(b)));
  });
}

export function renderCustomSections(
  rootContainer: HTMLElement | null,
  sections: readonly CustomSection[],
  pagePhotos?: Record<string, readonly MagazinePhoto[]>,
  pageTextBlocks?: Record<string, readonly PageTextBlock[]>,
): void {
  if (!rootContainer) return;

  rootContainer.replaceChildren(
    ...sections.map((section, idx) => {
      const pageKey = `custom-${section.id}`;
      const hasCustomPhotos = pagePhotos && Object.prototype.hasOwnProperty.call(pagePhotos, pageKey);
      const resolvedPhotos: readonly MagazinePhoto[] = hasCustomPhotos
        ? pagePhotos[pageKey] ?? []
        : [
            {
              id: `default-${section.id}`,
              src: CUSTOM_PAGE_PHOTOS[idx % CUSTOM_PAGE_PHOTOS.length],
              caption: section.eyebrow || 'Editorial Feature',
            },
          ];

      const secEl = document.createElement('article');
      secEl.hidden = true;
      secEl.className =
        resolvedPhotos.length === 0
          ? 'mag-page mag-spread is-zine-page no-photos'
          : 'mag-page mag-spread is-zine-page';
      secEl.id = pageKey;
      secEl.dataset.magPage = pageKey;
      secEl.dataset.customSection = section.id;
      secEl.dataset.magChapter = 'Chapter VIII · Special Features';
      secEl.dataset.magTopic = section.heading || 'Featured Spotlight';
      secEl.dataset.magTopicDesc =
        section.subtitle || 'Curated editorial feature, links, and cultural moments.';
      secEl.dataset.magTitle = section.heading || 'Featured Spotlight';
      secEl.dataset.magDesc =
        section.subtitle || 'Curated editorial feature, links, and cultural moments.';

      const canvas = document.createElement('div');
      canvas.className = 'mag-spread-canvas mag-zine-canvas';

      const folioBar = document.createElement('div');
      folioBar.className = 'mag-folio-bar';
      const folioTag = document.createElement('span');
      folioTag.className = 'mag-folio-tag';
      folioTag.textContent = section.eyebrow || 'SPECIAL FEATURE';
      const folioNum = document.createElement('span');
      folioNum.className = 'mag-folio-number';
      folioNum.textContent = 'FEATURE';
      folioBar.append(folioTag, folioNum);
      canvas.append(folioBar);

      const stage = document.createElement('div');
      stage.className = 'mag-ref-sheet';

      const leftStage = document.createElement('div');
      leftStage.className = 'mag-ref-left-stage';

      const stack = document.createElement('div');
      stack.className = 'mag-ref-photos';
      stack.dataset.pagePhotos = pageKey;
      stack.append(
        ...resolvedPhotos
          .map((photo, idx) => buildPhotoFigure(photo, false, idx))
          .filter((el): el is HTMLElement => el !== null),
      );
      leftStage.append(stack);

      if (section.eyebrow || section.heading || section.subtitle) {
        const header = document.createElement('header');
        header.className = 'mag-zine-head';

        if (section.eyebrow) {
          const eyebrow = document.createElement('p');
          eyebrow.className = 'mag-kicker';
          eyebrow.textContent = section.eyebrow;
          header.append(eyebrow);
        }
        if (section.heading) {
          const h2 = document.createElement('h2');
          h2.className = 'section-title mag-zine-title';
          h2.tabIndex = -1;
          h2.textContent = section.heading;
          header.append(h2);
        }
        if (section.subtitle) {
          const sub = document.createElement('p');
          sub.className = 'section-subtitle mag-zine-copy';
          sub.textContent = section.subtitle;
          header.append(sub);
        }
        leftStage.append(header);
      }

      const grid = document.createElement('div');
      grid.className = 'custom-elements-grid';

      for (const el of section.elements) {
        if (el.type === 'text') {
          const card = document.createElement('article');
          card.className = 'custom-text-card';
          if (el.title) {
            const h3 = document.createElement('h3');
            h3.className = 'case-client';
            h3.textContent = el.title;
            card.append(h3);
          }
          const p = document.createElement('p');
          p.className = 'case-summary';
          p.textContent = el.body;
          card.append(p);
          grid.append(card);
        } else if (el.type === 'button') {
          const card = document.createElement('div');
          card.className = 'custom-button-row';
          const a = document.createElement('a');
          a.className = el.variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';
          a.href = safeHref(el.href);
          if (/^https?:\/\//i.test(a.href)) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          a.textContent = el.label;
          card.append(a);
          grid.append(card);
        } else if (el.type === 'reference') {
          const card = document.createElement('article');
          card.className = 'custom-ref-card';

          const meta = document.createElement('div');
          meta.className = 'case-meta';

          const badge = document.createElement('span');
          badge.className = 'eyebrow';
          badge.textContent = formatPlatformLabel(el.platform);
          meta.append(badge);

          if (el.handle) {
            const handle = document.createElement('span');
            handle.className = 'case-sector';
            handle.textContent = el.handle;
            meta.append(handle);
          }

          const title = document.createElement('h3');
          title.className = 'case-client';
          title.textContent = el.title;

          card.append(meta, title);

          if (el.caption) {
            const caption = document.createElement('p');
            caption.className = 'case-summary';
            caption.textContent = el.caption;
            card.append(caption);
          }

          const ctaWrap = document.createElement('div');
          ctaWrap.style.marginBlockStart = '0.75rem';
          const link = document.createElement('a');
          link.className = 'btn btn-secondary';
          link.href = safeHref(el.url, '#work');
          if (/^https?:\/\//i.test(link.href)) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
          link.textContent = `Open ${formatPlatformLabel(el.platform)} ↗`;
          ctaWrap.append(link);
          card.append(ctaWrap);
          grid.append(card);
        }
      }

      const extraTexts = document.createElement('div');
      extraTexts.className = 'mag-page-extra-texts';
      extraTexts.dataset.pageTexts = pageKey;
      const customExtra = pageTextBlocks?.[pageKey] ?? [];
      if (customExtra.length > 0) {
        extraTexts.append(...customExtra.map((b) => buildTextBlockNode(b)));
      }

      leftStage.append(grid, extraTexts);

      const rightCol = document.createElement('aside');
      rightCol.className = 'mag-ref-right-col';

      const trio = document.createElement('div');
      trio.className = 'mag-ref-mini-trio';
      trio.setAttribute('aria-hidden', 'true');
      [0, 1, 2].forEach((offset) => {
        const snap = document.createElement('img');
        snap.src = CUSTOM_PAGE_PHOTOS[(idx + offset) % CUSTOM_PAGE_PHOTOS.length];
        snap.alt = '';
        snap.decoding = 'async';
        trio.append(snap);
      });

      const noteBox = document.createElement('div');
      noteBox.className = 'mag-note-box';
      const ribbon = document.createElement('span');
      ribbon.className = 'mag-note-ribbon';
      ribbon.textContent = section.eyebrow || 'FEATURE NOTE';
      const noteCopy = document.createElement('p');
      noteCopy.className = 'mag-zine-copy';
      noteCopy.textContent =
        section.subtitle || 'Curated Main Character Media feature editorial & creator highlights.';
      noteBox.append(ribbon, noteCopy);

      rightCol.append(trio, noteBox);
      stage.append(leftStage, rightCol);

      const folioOval = document.createElement('span');
      folioOval.className = 'mag-folio-oval';
      folioOval.setAttribute('aria-hidden', 'true');
      folioOval.textContent = String(idx + 12).padStart(2, '0');

      canvas.append(stage, folioOval);
      secEl.append(canvas);
      return secEl;
    }),
  );
}

export function applyHiddenSections(
  root: ParentNode,
  hiddenSections: readonly BuiltinSectionKey[],
): void {
  const hiddenSet = new Set<string>(hiddenSections);
  root.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
    const key = el.dataset.section;
    if (!key) return;
    const isHidden = hiddenSet.has(key);
    if (el.hasAttribute('data-mag-page')) {
      if (isHidden) {
        el.dataset.sectionHidden = 'true';
        el.hidden = true;
      } else {
        delete el.dataset.sectionHidden;
      }
    } else {
      el.hidden = isHidden;
    }
  });
}

export function applySiteContent(root: ParentNode, content: Partial<SiteContent>): void {
  const setText = (selector: string, value: string | undefined) => {
    if (value === undefined) return;
    const el = root.querySelector<HTMLElement>(selector);
    if (el) el.textContent = value;
  };

  const brandTitleEl =
    root.querySelector<HTMLElement>('#hero-brand-title-text') ??
    root.querySelector<HTMLElement>('#main-heading');
  if (brandTitleEl && content.brandTitle !== undefined) {
    brandTitleEl.textContent = content.brandTitle;
  }
  setText('#hero-brand-subtitle', content.brandSubtitle);
  setText('#hero-primary-cta', content.primaryCtaLabel);
  setText('#hero-secondary-cta', content.secondaryCtaLabel);
  setText('#work-eyebrow', content.workEyebrow);
  setText('#work-heading', content.workHeading);
  setText('#work-subtitle', content.workSubtitle);
  setText('#events-eyebrow', content.eventsEyebrow);
  setText('#events-heading', content.eventsHeading);
  setText('#events-subtitle', content.eventsSubtitle);
  setText('#services-eyebrow', content.servicesEyebrow);
  setText('#services-heading', content.servicesHeading);
  setText('#services-subtitle', content.servicesSubtitle);
  setText('#culture-eyebrow', content.cultureEyebrow);
  setText('#culture-heading', content.cultureHeading);
  setText('#culture-subtitle', content.cultureSubtitle);
  setText('#culture-quote-text', content.cultureQuote);
  setText('#culture-quote-author', content.cultureQuoteAuthor);
  setText('#faq-eyebrow', content.faqEyebrow);
  setText('#faq-heading', content.faqHeading);
  setText('#faq-subtitle', content.faqSubtitle);
  setText('#brief-eyebrow', content.briefEyebrow);
  setText('#brief-heading', content.briefHeading);
  setText('#brief-subtitle', content.briefSubtitle);
  setText('#brief-submit', content.briefSubmitLabel);
}
