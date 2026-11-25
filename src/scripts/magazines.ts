export interface MagazineCoverSpec {
  id: string;
  masthead: string;
  issue: string;
  headline: string;
  subline: string;
  tag: string;
  paperColor: string;
  accentColor: string;
  bandColor: string;
  inkColor: string;
  placementClass: string;
  motif: 'sunglasses' | 'sparkle' | 'vinyl' | 'runway' | 'lipgloss' | 'flipphone';
}

export const PERIMETER_MAGAZINES: readonly MagazineCoverSpec[] = [
  {
    id: 'mag-vogue-left',
    masthead: 'VOGUE',
    issue: 'SEP 04',
    headline: 'FASHION MEETS FEED',
    subline: 'THE MAIN CHARACTER ISSUE',
    tag: 'COVER STAR',
    paperColor: '#E9D6C4',
    accentColor: '#B9D7ED',
    bandColor: '#F8D98B',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-tl',
    motif: 'sunglasses',
  },
  {
    id: 'mag-teen-left',
    masthead: 'TEEN',
    issue: 'SUMMER',
    headline: 'IT-GIRL ERA',
    subline: 'BEST VIRAL LAUNCHES',
    tag: 'HOT LIST',
    paperColor: '#F8D98B',
    accentColor: '#F8DCE8',
    bandColor: '#D9C5E9',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-ml',
    motif: 'lipgloss',
  },
  {
    id: 'mag-vogueview-bl',
    masthead: 'MUSE',
    issue: 'RESORT',
    headline: 'TINY BUBBLES & BIG DROPS',
    subline: 'RUNWAY TO REELS',
    tag: 'ARCHIVE',
    paperColor: '#B9D7ED',
    accentColor: '#E9D6C4',
    bandColor: '#F8DCE8',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-bl',
    motif: 'runway',
  },
  {
    id: 'mag-cosmo-tr',
    masthead: 'COSMO',
    issue: 'VOL 08',
    headline: 'HOT SHOTS & HOOKS',
    subline: 'HOW TO OWN THE ALGORITHM',
    tag: 'EXCLUSIVE',
    paperColor: '#D9C5E9',
    accentColor: '#F8D98B',
    bandColor: '#F8DCE8',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-tr',
    motif: 'sparkle',
  },
  {
    id: 'mag-elle-mr',
    masthead: 'ELLE',
    issue: 'DISCO 2K',
    headline: 'UPFRONT CULTURE',
    subline: 'CREATOR SEEDING REPORT',
    tag: 'NEW WAVE',
    paperColor: '#E9D6C4',
    accentColor: '#D9C5E9',
    bandColor: '#B9D7ED',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-mr',
    motif: 'vinyl',
  },
  {
    id: 'mag-drama-br',
    masthead: 'DRAMA',
    issue: 'QUEENS',
    headline: 'DARING & TOTALLY COOL',
    subline: '100% CULTURAL VELOCITY',
    tag: 'EDITORS PICK',
    paperColor: '#B9D7ED',
    accentColor: '#F8D98B',
    bandColor: '#E9D6C4',
    inkColor: '#F4A6C1',
    placementClass: 'mag-pos-br',
    motif: 'flipphone',
  },
];

export const HERO_CORNER_MAGAZINES: readonly MagazineCoverSpec[] = [
  {
    id: 'hero-mag-1',
    masthead: 'VOGUE',
    issue: 'NO. 01',
    headline: 'ART OF THE SCROLL',
    subline: 'MC STUDIO',
    tag: 'FALL EDIT',
    paperColor: '#B9D7ED',
    accentColor: '#F8D98B',
    bandColor: '#F8DCE8',
    inkColor: '#F4A6C1',
    placementClass: 'hero-mag-tl',
    motif: 'sunglasses',
  },
  {
    id: 'hero-mag-2',
    masthead: 'COSMO',
    issue: 'NO. 02',
    headline: 'ICON STATUS',
    subline: 'CREATOR PODS',
    tag: 'DROP 24',
    paperColor: '#D9C5E9',
    accentColor: '#E9D6C4',
    bandColor: '#F8D98B',
    inkColor: '#F4A6C1',
    placementClass: 'hero-mag-tr',
    motif: 'sparkle',
  },
  {
    id: 'hero-mag-3',
    masthead: 'ELLE',
    issue: 'NO. 03',
    headline: 'FEED TAKEOVER',
    subline: 'PAID + ORGANIC',
    tag: 'GLOSS',
    paperColor: '#F8D98B',
    accentColor: '#B9D7ED',
    bandColor: '#F8DCE8',
    inkColor: '#F4A6C1',
    placementClass: 'hero-mag-bl',
    motif: 'vinyl',
  },
  {
    id: 'hero-mag-4',
    masthead: 'DRAMA',
    issue: 'NO. 04',
    headline: 'MAIN CHARACTER',
    subline: 'Y2K EDITION',
    tag: 'MUST READ',
    paperColor: '#E9D6C4',
    accentColor: '#D9C5E9',
    bandColor: '#F8D98B',
    inkColor: '#F4A6C1',
    placementClass: 'hero-mag-br',
    motif: 'flipphone',
  },
];

function renderMotifSvg(spec: MagazineCoverSpec): string {
  switch (spec.motif) {
    case 'sunglasses':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <path d="M22 44c0-10 10-16 20-12 6 2 10 4 18 4s12-2 18-4c10-4 20 2 20 12 0 11-10 18-22 16-8-1-12-8-16-8s-8 7-16 8c-12 2-22-5-22-16Z" fill="${spec.inkColor}" stroke="${spec.bandColor}" stroke-width="3"/>
          <path d="M30 40l8-6M74 40l8-6" stroke="${spec.paperColor}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M96 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="${spec.bandColor}"/>
        </svg>`;
    case 'sparkle':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <ellipse cx="60" cy="42" rx="42" ry="15" transform="rotate(-14 60 42)" stroke="${spec.inkColor}" stroke-width="3"/>
          <path d="M60 16l5 17 17 5-17 5-5 17-5-17-17-5 17-5 5-17Z" fill="${spec.bandColor}" stroke="${spec.inkColor}" stroke-width="2"/>
          <circle cx="28" cy="24" r="5" fill="${spec.paperColor}"/>
        </svg>`;
    case 'vinyl':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <circle cx="60" cy="42" r="28" fill="${spec.inkColor}" stroke="${spec.bandColor}" stroke-width="3"/>
          <circle cx="60" cy="42" r="19" stroke="${spec.paperColor}" stroke-width="1.5"/>
          <circle cx="60" cy="42" r="10" fill="${spec.bandColor}"/>
          <circle cx="60" cy="42" r="3.5" fill="${spec.inkColor}"/>
        </svg>`;
    case 'runway':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <circle cx="60" cy="22" r="8" fill="${spec.inkColor}"/>
          <path d="M48 34h24l10 38H38l10-38Z" fill="${spec.bandColor}" stroke="${spec.inkColor}" stroke-width="2.5"/>
          <path d="M24 20l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="${spec.inkColor}"/>
        </svg>`;
    case 'lipgloss':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <rect x="44" y="34" width="32" height="36" rx="6" fill="${spec.inkColor}" stroke="${spec.bandColor}" stroke-width="2.5"/>
          <rect x="51" y="16" width="18" height="18" rx="4" fill="${spec.bandColor}" stroke="${spec.inkColor}" stroke-width="2"/>
          <path d="M26 52c4-5 11-5 14 0-3 5-10 5-14 0Z" fill="${spec.inkColor}"/>
        </svg>`;
    case 'flipphone':
      return `
        <svg viewBox="0 0 120 84" class="mag-art" fill="none">
          <rect x="6" y="6" width="108" height="72" rx="10" fill="${spec.accentColor}"/>
          <rect x="41" y="13" width="38" height="28" rx="6" fill="${spec.bandColor}" stroke="${spec.inkColor}" stroke-width="2.5"/>
          <rect x="41" y="42" width="38" height="29" rx="6" fill="${spec.paperColor}" stroke="${spec.inkColor}" stroke-width="2.5"/>
          <rect x="48" y="19" width="24" height="16" rx="3" fill="${spec.inkColor}"/>
          <circle cx="52" cy="52" r="2.5" fill="${spec.inkColor}"/>
          <circle cx="60" cy="52" r="2.5" fill="${spec.inkColor}"/>
          <circle cx="68" cy="52" r="2.5" fill="${spec.inkColor}"/>
          <circle cx="52" cy="61" r="2.5" fill="${spec.inkColor}"/>
          <circle cx="60" cy="61" r="2.5" fill="${spec.inkColor}"/>
          <circle cx="68" cy="61" r="2.5" fill="${spec.inkColor}"/>
        </svg>`;
  }
}

export function createMagazineElement(spec: MagazineCoverSpec): HTMLElement {
  const article = document.createElement('div');
  article.className = `mag-cover ${spec.placementClass}`;
  article.dataset.magId = spec.id;
  article.style.setProperty('--mag-paper', spec.paperColor);
  article.style.setProperty('--mag-band', spec.bandColor);

  article.innerHTML = `
    <div class="mag-top">
      <span class="mag-masthead">${spec.masthead}</span>
      <span class="mag-issue">${spec.issue}</span>
    </div>
    <span class="mag-tag">${spec.tag}</span>
    ${renderMotifSvg(spec)}
    <div class="mag-copy">
      <span class="mag-headline">${spec.headline}</span>
      <span class="mag-subline">${spec.subline}</span>
    </div>
    <div class="mag-footer">
      <span class="mag-barcode" aria-hidden="true"></span>
      <span class="mag-price">MCM · 00s</span>
    </div>
  `;

  return article;
}

export function initMagazineCollage(root: ParentNode = document): void {
  const perimeterHost = root.querySelector<HTMLElement>('#magazine-collage');
  if (perimeterHost) {
    perimeterHost.setAttribute('aria-hidden', 'true');
    perimeterHost.replaceChildren(...PERIMETER_MAGAZINES.map(createMagazineElement));
  }

  const heroHost = root.querySelector<HTMLElement>('#hero-magazines');
  if (heroHost) {
    heroHost.setAttribute('aria-hidden', 'true');
    heroHost.replaceChildren(...HERO_CORNER_MAGAZINES.map(createMagazineElement));
  }
}

