export interface MagazineCoverSpec {
  id: string;
  masthead: string;
  issue: string;
  headline: string;
  subline: string;
  tag: string;
  image: string;
  paperColor: string;
  bandColor: string;
  placementClass: string;
  variant?: 'cover' | 'spread' | 'grid' | 'flatlay';
}

export const PERIMETER_MAGAZINES: readonly MagazineCoverSpec[] = [
  {
    id: 'mag-vogue-left',
    masthead: 'VOGUE',
    issue: 'SEP 04',
    headline: 'FASHION MEETS ART',
    subline: 'THE MAIN CHARACTER ISSUE',
    tag: 'COVER STAR',
    image: '/magazines/mag-01.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#F8D98B',
    placementClass: 'mag-pos-tl',
  },
  {
    id: 'mag-teen-left',
    masthead: 'TEEN',
    issue: 'SUMMER',
    headline: 'KILLER EDIT',
    subline: 'BEST VIRAL LAUNCHES',
    tag: 'HOT LIST',
    image: '/magazines/mag-03.jpg',
    paperColor: '#F8D98B',
    bandColor: '#D9C5E9',
    placementClass: 'mag-pos-ml',
  },
  {
    id: 'mag-vogueview-bl',
    masthead: 'VOGUE',
    issue: 'RESORT',
    headline: 'TINY BUBBLES',
    subline: 'RUNWAY TO REELS',
    tag: 'ARCHIVE',
    image: '/magazines/mag-07.jpg',
    paperColor: '#B9D7ED',
    bandColor: '#F8DCE8',
    placementClass: 'mag-pos-bl',
  },
  {
    id: 'mag-cosmo-tr',
    masthead: 'COSMO',
    issue: 'VOL 08',
    headline: 'HOT SHOTS',
    subline: 'OWN THE ALGORITHM',
    tag: 'EXCLUSIVE',
    image: '/magazines/mag-02.jpg',
    paperColor: '#D9C5E9',
    bandColor: '#F8D98B',
    placementClass: 'mag-pos-tr',
  },
  {
    id: 'mag-elle-mr',
    masthead: 'ELLE',
    issue: 'DISCO 2K',
    headline: 'UPFRONT CULTURE',
    subline: 'CREATOR SEEDING REPORT',
    tag: 'NEW WAVE',
    image: '/magazines/mag-06.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#B9D7ED',
    placementClass: 'mag-pos-mr',
  },
  {
    id: 'mag-drama-br',
    masthead: 'DRAMA',
    issue: 'QUEENS',
    headline: 'TOTALLY COOL',
    subline: 'CULTURAL VELOCITY',
    tag: 'EDITORS PICK',
    image: '/magazines/mag-04.jpg',
    paperColor: '#B9D7ED',
    bandColor: '#F8D98B',
    placementClass: 'mag-pos-br',
  },
];

export const HERO_CORNER_MAGAZINES: readonly MagazineCoverSpec[] = [
  {
    id: 'hero-tl-1',
    masthead: 'VOGUE',
    issue: 'NO. 01',
    headline: 'IT-GIRL ERA',
    subline: 'FALL EDIT',
    tag: 'GLOSS',
    image: '/magazines/mag-07.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#B9D7ED',
    placementClass: 'hero-mag-tl-back',
  },
  {
    id: 'hero-tl-2',
    masthead: 'VOGUE',
    issue: 'BEAUTY',
    headline: 'FASHION MEETS ART',
    subline: 'STUDIO FLASH',
    tag: 'COVER',
    image: '/magazines/mag-01.jpg',
    paperColor: '#F8DCE8',
    bandColor: '#F8D98B',
    placementClass: 'hero-mag-tl-front',
  },
  {
    id: 'hero-ml-teen',
    masthead: 'teenVOGUE',
    issue: 'SUMMER',
    headline: 'SUMMER FASHION',
    subline: '10 BEST CAMPAIGNS',
    tag: 'ISSUE 04',
    image: '/magazines/mag-03.jpg',
    paperColor: '#F8D98B',
    bandColor: '#F8DCE8',
    placementClass: 'hero-mag-ml',
  },
  {
    id: 'hero-bl-duo',
    masthead: 'VOGUE',
    issue: 'NIGHTS',
    headline: 'DRESSES THAT CAUSE',
    subline: 'PARTY REPORT',
    tag: 'STYLE',
    image: '/magazines/mag-04.jpg',
    paperColor: '#D9C5E9',
    bandColor: '#F8D98B',
    placementClass: 'hero-mag-bl-top',
  },
  {
    id: 'hero-bl-view',
    masthead: 'VOGUEVIEW',
    issue: 'FALL 00',
    headline: 'TRACING A TREND',
    subline: 'TINY BUBBLES',
    tag: 'RUNWAY',
    image: '/magazines/mag-08.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#B9D7ED',
    placementClass: 'hero-mag-bl-low',
  },
  {
    id: 'hero-mid-strip',
    masthead: 'ARCHIVE',
    issue: 'CUTS',
    headline: 'FLASH POLAROIDS',
    subline: 'BTS STUDIO',
    tag: 'COLLAGE',
    image: '/magazines/mag-09.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#F8DCE8',
    placementClass: 'hero-mag-upper-strip',
  },
  {
    id: 'hero-tr-pop',
    masthead: 'STAR',
    issue: '45 LOOKS',
    headline: 'POP CULTURE',
    subline: 'VIRAL ERA',
    tag: 'HOT',
    image: '/magazines/mag-10.jpg',
    paperColor: '#B9D7ED',
    bandColor: '#F8D98B',
    placementClass: 'hero-mag-tr-pop',
  },
  {
    id: 'hero-tr-grid',
    masthead: 'VOGUE',
    issue: '2000s',
    headline: 'COVER ARCHIVE',
    subline: '12 ICONIC SHOOTS',
    tag: 'GRID',
    image: '/magazines/mag-02.jpg',
    paperColor: '#F8DCE8',
    bandColor: '#D9C5E9',
    placementClass: 'hero-mag-tr-grid',
    variant: 'grid',
  },
  {
    id: 'hero-mr-cosmo',
    masthead: 'COSMOPOLITAN',
    issue: 'MAY',
    headline: 'HOT SHOTS!',
    subline: 'CREATOR PLAYBOOK',
    tag: 'COVER',
    image: '/magazines/mag-02.jpg',
    paperColor: '#D9C5E9',
    bandColor: '#F8D98B',
    placementClass: 'hero-mag-mr-cosmo',
  },
  {
    id: 'hero-mr-elle',
    masthead: 'ELLE upfront',
    issue: 'DISCO 2000s',
    headline: 'THE MOOD',
    subline: 'NOW & NEXT',
    tag: 'RUNWAY',
    image: '/magazines/mag-06.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#B9D7ED',
    placementClass: 'hero-mag-mr-elle',
  },
  {
    id: 'hero-br-drama',
    masthead: 'Drama Queens',
    issue: 'SPECIAL',
    headline: 'DARING & COOL',
    subline: 'TOTALLY ICONIC',
    tag: 'FEATURE',
    image: '/magazines/mag-04.jpg',
    paperColor: '#F8DCE8',
    bandColor: '#F8D98B',
    placementClass: 'hero-mag-br-drama',
  },
  {
    id: 'hero-br-lookbook',
    masthead: 'LOOKBOOK',
    issue: 'EDIT',
    headline: 'NAUGHTY & NICE',
    subline: 'SLIP & HEELS',
    tag: 'SHOP',
    image: '/magazines/mag-05.jpg',
    paperColor: '#F8DCE8',
    bandColor: '#E9D6C4',
    placementClass: 'hero-mag-br-lookbook',
    variant: 'flatlay',
  },
  {
    id: 'hero-bc-spread',
    masthead: 'y',
    issue: 'SPREAD',
    headline: 'WHO IS THE MAIN CHARACTER?',
    subline: 'A LOOK AT THE CULTURAL SHIFT',
    tag: 'EDITORIAL',
    image: '/magazines/mag-09.jpg',
    paperColor: '#E9D6C4',
    bandColor: '#F8DCE8',
    placementClass: 'hero-mag-bc-spread',
    variant: 'spread',
  },
];

const GRID_IMAGES = [
  '/magazines/mag-01.jpg',
  '/magazines/mag-02.jpg',
  '/magazines/mag-03.jpg',
  '/magazines/mag-04.jpg',
  '/magazines/mag-06.jpg',
  '/magazines/mag-07.jpg',
  '/magazines/mag-08.jpg',
  '/magazines/mag-09.jpg',
  '/magazines/mag-10.jpg',
];

export function createMagazineElement(spec: MagazineCoverSpec): HTMLElement {
  const article = document.createElement('div');
  article.className = `mag-cover ${spec.placementClass}${spec.variant ? ` mag-variant-${spec.variant}` : ''}`;
  article.dataset.magId = spec.id;
  article.style.setProperty('--mag-paper', spec.paperColor);
  article.style.setProperty('--mag-band', spec.bandColor);

  if (spec.variant === 'spread') {
    article.innerHTML = `
      <div class="mag-spread-left">
        <img src="${spec.image}" alt="" class="mag-photo" decoding="async" />
      </div>
      <div class="mag-spread-right">
        <span class="mag-dropcap">${spec.masthead}</span>
        <span class="mag-spread-kicker">${spec.headline}</span>
        <span class="mag-spread-lines"></span>
        <span class="mag-spread-lines"></span>
        <span class="mag-spread-lines"></span>
      </div>
    `;
    return article;
  }

  if (spec.variant === 'grid') {
    article.innerHTML = `
      <div class="mag-mini-grid">
        ${GRID_IMAGES.map(
          (src) => `
            <div class="mag-mini-tile">
              <span class="mag-mini-head">VOGUE</span>
              <img src="${src}" alt="" class="mag-photo" decoding="async" />
            </div>
          `,
        ).join('')}
      </div>
    `;
    return article;
  }

  article.innerHTML = `
    <img src="${spec.image}" alt="" class="mag-photo mag-bg-photo" decoding="async" />
    <div class="mag-overlay">
      <div class="mag-top">
        <span class="mag-masthead">${spec.masthead}</span>
        <span class="mag-issue">${spec.issue}</span>
      </div>
      <div class="mag-bottom-stack">
        <span class="mag-tag">${spec.tag}</span>
        <div class="mag-copy">
          <span class="mag-headline">${spec.headline}</span>
          <span class="mag-subline">${spec.subline}</span>
        </div>
        <div class="mag-footer">
          <span class="mag-barcode" aria-hidden="true"></span>
          <span class="mag-price">MCM · 00s</span>
        </div>
      </div>
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
