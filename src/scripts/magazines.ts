export interface MagazineCoverSpec {
  id: string;
  masthead: string;
  mastheadColor: string;
  headline: string;
  coverlines: string[];
  sticker?: { text: string; bg: string; fg: string };
  image: string;
  paperColor: string;
  placementClass: string;
  variant?: 'cover' | 'spread' | 'grid' | 'strip' | 'lookbook';
}

export const PERIMETER_MAGAZINES: readonly MagazineCoverSpec[] = [
  {
    id: 'mag-vogue-left',
    masthead: 'VOGUE',
    mastheadColor: '#ffffff',
    headline: 'FASHION MEETS ART',
    coverlines: ['STUDIO FLASH', 'THE IT-GIRL ISSUE', 'AUTUMN EDIT'],
    image: '/magazines/mag-01.jpg',
    paperColor: '#f5f2eb',
    placementClass: 'mag-pos-tl',
  },
  {
    id: 'mag-teen-left',
    masthead: 'teenVOGUE',
    mastheadColor: '#111111',
    headline: 'SUMMER FASHION',
    coverlines: ['10 BEST CAMPAIGNS', 'CREATOR POWER'],
    sticker: { text: 'HOT LIST', bg: '#e6007e', fg: '#ffffff' },
    image: '/magazines/mag-03.jpg',
    paperColor: '#ffffff',
    placementClass: 'mag-pos-ml',
  },
  {
    id: 'mag-vogueview-bl',
    masthead: 'VOGUEVIEW',
    mastheadColor: '#111111',
    headline: 'TRACING A TREND',
    coverlines: ['RESORT 2000', 'RUNWAY ARCHIVE'],
    image: '/magazines/mag-07.jpg',
    paperColor: '#f7f5f0',
    placementClass: 'mag-pos-bl',
  },
  {
    id: 'mag-cosmo-tr',
    masthead: 'COSMOPOLITAN',
    mastheadColor: '#e6007e',
    headline: 'HOT SHOTS!',
    coverlines: ['OWN THE FEED', 'VIRAL LAUNCHES'],
    image: '/magazines/mag-02.jpg',
    paperColor: '#f3d9e6',
    placementClass: 'mag-pos-tr',
  },
  {
    id: 'mag-elle-mr',
    masthead: 'ELLE upfront',
    mastheadColor: '#111111',
    headline: 'THE MOOD: DISCO 2000s',
    coverlines: ['NOW & NEXT', 'CULTURE REPORT'],
    image: '/magazines/mag-06.jpg',
    paperColor: '#f2efe9',
    placementClass: 'mag-pos-mr',
  },
  {
    id: 'mag-drama-br',
    masthead: 'Drama Queens',
    mastheadColor: '#e6007e',
    headline: "THEY'RE DARING & TOTALLY COOL",
    coverlines: ['PARTY DUO', 'EXCLUSIVE INTERVIEW'],
    sticker: { text: 'NEW!', bg: '#8ce043', fg: '#111111' },
    image: '/magazines/mag-11.jpg',
    paperColor: '#ffffff',
    placementClass: 'mag-pos-br',
  },
];

export const HERO_CORNER_MAGAZINES: readonly MagazineCoverSpec[] = [
  /* Top-left stacked fan (mirrors 4 overlapping Vogue/fashion covers in reference) */
  {
    id: 'hero-tl-1',
    masthead: 'VOGUE',
    mastheadColor: '#ffffff',
    headline: 'HIGH GLOSS',
    coverlines: ['NEW YORK', 'MILAN'],
    image: '/magazines/mag-15.jpg',
    paperColor: '#f7f4ee',
    placementClass: 'hero-mag-tl-1',
  },
  {
    id: 'hero-tl-2',
    masthead: 'VOGUE',
    mastheadColor: '#ffffff',
    headline: 'MISS TRENDS',
    coverlines: ['STREET EDIT', 'DENIM ERA'],
    image: '/magazines/mag-13.jpg',
    paperColor: '#eef2f5',
    placementClass: 'hero-mag-tl-2',
  },
  {
    id: 'hero-tl-3',
    masthead: 'VOGUE',
    mastheadColor: '#d4001a',
    headline: 'WINTER GLAM',
    coverlines: ['COUTURE', 'AFTER DARK'],
    image: '/magazines/mag-12.jpg',
    paperColor: '#ffffff',
    placementClass: 'hero-mag-tl-3',
  },
  {
    id: 'hero-tl-4',
    masthead: 'VOGUE',
    mastheadColor: '#ffffff',
    headline: 'NEW LOOK',
    coverlines: ['ANIMAL PRINT', 'ICONIC'],
    image: '/magazines/mag-14.jpg',
    paperColor: '#f6f3ed',
    placementClass: 'hero-mag-tl-4',
  },
  /* Main prominent Vogue Kate-style close-up overlapping top-left toward center */
  {
    id: 'hero-tl-main',
    masthead: 'VOGUE',
    mastheadColor: '#e6007e',
    headline: 'FASHION MEETS ART',
    coverlines: ['SEVEN ARTISTS', 'NEW GLAMOUR', 'BEAUTY ISSUE'],
    image: '/magazines/mag-01.jpg',
    paperColor: '#f7f4ef',
    placementClass: 'hero-mag-tl-main',
  },
  /* Mid-left Teen Vogue cover */
  {
    id: 'hero-ml-teen',
    masthead: 'teenVOGUE',
    mastheadColor: '#111111',
    headline: 'SUMMER FASHION',
    coverlines: ['10 BEST LOOKS', 'CULTURE'],
    sticker: { text: 'HOT', bg: '#f5d000', fg: '#111111' },
    image: '/magazines/mag-03.jpg',
    paperColor: '#ffffff',
    placementClass: 'hero-mag-ml-teen',
  },
  /* Lower-left Vogue duo & VogueView sheet */
  {
    id: 'hero-bl-duo',
    masthead: 'VOGUE',
    mastheadColor: '#1b3b73',
    headline: 'DRESSES THAT CAUSE A SCENE',
    coverlines: ['PARTY NIGHTS', 'HIGH SHINE'],
    image: '/magazines/mag-11.jpg',
    paperColor: '#f6f2eb',
    placementClass: 'hero-mag-bl-duo',
  },
  {
    id: 'hero-bl-no-doubt',
    masthead: 'STYLE',
    mastheadColor: '#e6007e',
    headline: 'NO DOUBT ABOUT HER',
    coverlines: ['LOOKS', 'ACCESSORIES', '2000s'],
    image: '/magazines/mag-07.jpg',
    paperColor: '#dbe9f4',
    placementClass: 'hero-mag-bl-style',
  },
  {
    id: 'hero-bl-view',
    masthead: 'VOGUEVIEW',
    mastheadColor: '#111111',
    headline: 'tiny bubbles',
    coverlines: ['RESORT 2000', 'FALL 2000'],
    image: '/magazines/mag-06.jpg',
    paperColor: '#f5f3ee',
    placementClass: 'hero-mag-bl-view',
  },
  /* Upper-center fanned mini spread strip (between top MC and middle logo) */
  {
    id: 'hero-upper-strip',
    masthead: 'FLASH',
    mastheadColor: '#111111',
    headline: 'STUDIO CONTACT SHEET',
    coverlines: ['BEHIND THE LENS'],
    image: '/magazines/mag-09.jpg',
    paperColor: '#f4f0ea',
    placementClass: 'hero-mag-upper-strip',
    variant: 'strip',
  },
  /* Top-right tilted Star/Beauty cover + 3x4 Vogue cover archive grid */
  {
    id: 'hero-tr-pop',
    masthead: 'BEAUTY',
    mastheadColor: '#e6007e',
    headline: '45 WAYS TO OWN THE FEED',
    coverlines: ['POP ERA', 'ICONIC', 'FRONT ROW'],
    image: '/magazines/mag-10.jpg',
    paperColor: '#1a1a1a',
    placementClass: 'hero-mag-tr-pop',
  },
  {
    id: 'hero-tr-grid',
    masthead: 'VOGUE',
    mastheadColor: '#d4001a',
    headline: 'ARCHIVE GRID',
    coverlines: [],
    image: '/magazines/mag-02.jpg',
    paperColor: '#ffffff',
    placementClass: 'hero-mag-tr-grid',
    variant: 'grid',
  },
  /* Mid-right Cosmo & Elle Upfront */
  {
    id: 'hero-mr-cosmo',
    masthead: 'COSMOPOLITAN',
    mastheadColor: '#e6007e',
    headline: 'Hot Shots!',
    coverlines: ['THE NEW LOOK', 'RUNWAY EDIT', 'MUST-HAVES'],
    image: '/magazines/mag-02.jpg',
    paperColor: '#f2d9e4',
    placementClass: 'hero-mag-mr-cosmo',
  },
  {
    id: 'hero-mr-elle',
    masthead: 'ELLE upfront',
    mastheadColor: '#111111',
    headline: 'THE MOOD Disco 2000s',
    coverlines: ['BAGS', 'SHADES', 'IT PIECES'],
    image: '/magazines/mag-06.jpg',
    paperColor: '#f4f2ed',
    placementClass: 'hero-mag-mr-elle',
  },
  /* Bottom-right Drama Queens & Lookbook */
  {
    id: 'hero-br-drama',
    masthead: 'Drama Queens',
    mastheadColor: '#e6007e',
    headline: "They're daring, dramatic and totally cool!",
    coverlines: ['BESTIES', 'POP ICONS'],
    sticker: { text: 'GOSSIP!', bg: '#8ce043', fg: '#111111' },
    image: '/magazines/mag-04.jpg',
    paperColor: '#f9e3ee',
    placementClass: 'hero-mag-br-drama',
  },
  {
    id: 'hero-br-lookbook',
    masthead: 'naughty and nice',
    mastheadColor: '#111111',
    headline: 'TAKE A BOW',
    coverlines: ['PINK HEELS', 'FLORAL TOTE', 'SLIP EDIT'],
    image: '/magazines/mag-05.jpg',
    paperColor: '#f7f5f0',
    placementClass: 'hero-mag-br-lookbook',
    variant: 'lookbook',
  },
  /* Bottom-center open 2-page spread + fanned bottom collage */
  {
    id: 'hero-bc-fan-left',
    masthead: 'MAXIM',
    mastheadColor: '#d4001a',
    headline: 'ARCHIVE PILE',
    coverlines: ['HIGH GLOSS'],
    image: '/magazines/mag-08.jpg',
    paperColor: '#f4efe8',
    placementClass: 'hero-mag-bc-fan-left',
  },
  {
    id: 'hero-bc-spread',
    masthead: 'y',
    mastheadColor: '#111111',
    headline: 'But who is complaining? A look at the all-access era of modern pop culture.',
    coverlines: [],
    image: '/magazines/mag-09.jpg',
    paperColor: '#f5f2eb',
    placementClass: 'hero-mag-bc-spread',
    variant: 'spread',
  },
  {
    id: 'hero-bc-fan-right',
    masthead: 'COUTURE',
    mastheadColor: '#ffffff',
    headline: 'AFTER HOURS',
    coverlines: ['BTS'],
    image: '/magazines/mag-12.jpg',
    paperColor: '#222222',
    placementClass: 'hero-mag-bc-fan-right',
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
  '/magazines/mag-11.jpg',
  '/magazines/mag-12.jpg',
  '/magazines/mag-14.jpg',
];

const STRIP_IMAGES = [
  '/magazines/mag-08.jpg',
  '/magazines/mag-05.jpg',
  '/magazines/mag-09.jpg',
  '/magazines/mag-12.jpg',
];

export function createMagazineElement(spec: MagazineCoverSpec): HTMLElement {
  const article = document.createElement('div');
  article.className = `mag-cover ${spec.placementClass}${spec.variant ? ` mag-variant-${spec.variant}` : ''}`;
  article.dataset.magId = spec.id;
  article.style.setProperty('--mag-paper', spec.paperColor);
  article.style.setProperty('--mag-ink', spec.mastheadColor);

  if (spec.variant === 'spread') {
    article.innerHTML = `
      <div class="mag-spread-left">
        <img src="${spec.image}" alt="" class="mag-photo" decoding="async" />
      </div>
      <div class="mag-spread-right">
        <span class="mag-dropcap">${spec.masthead}</span>
        <span class="mag-spread-kicker">${spec.headline}</span>
        <span class="mag-spread-body">From viral TikTok series to creator-led launches, cultural dominance starts on the cover.</span>
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
          (src, idx) => `
            <div class="mag-mini-tile">
              <span class="mag-mini-head">${idx % 2 === 0 ? 'VOGUE' : 'MUSE'}</span>
              <img src="${src}" alt="" class="mag-photo" decoding="async" />
            </div>
          `,
        ).join('')}
      </div>
    `;
    return article;
  }

  if (spec.variant === 'strip') {
    article.innerHTML = `
      <div class="mag-strip-collage">
        ${STRIP_IMAGES.map(
          (src) => `
            <div class="mag-strip-card">
              <img src="${src}" alt="" class="mag-photo" decoding="async" />
            </div>
          `,
        ).join('')}
      </div>
    `;
    return article;
  }

  if (spec.variant === 'lookbook') {
    article.innerHTML = `
      <div class="mag-lookbook-wrap">
        <span class="mag-lookbook-title">${spec.masthead}</span>
        <div class="mag-lookbook-photo">
          <img src="${spec.image}" alt="" class="mag-photo" decoding="async" />
        </div>
        <div class="mag-lookbook-caption">
          <strong>${spec.headline}</strong>
          <span>${spec.coverlines.join(' · ')}</span>
        </div>
      </div>
    `;
    return article;
  }

  const stickerHtml = spec.sticker
    ? `<span class="mag-sticker" style="background:${spec.sticker.bg};color:${spec.sticker.fg};">${spec.sticker.text}</span>`
    : '';

  article.innerHTML = `
    <img src="${spec.image}" alt="" class="mag-photo mag-bg-photo" decoding="async" />
    <div class="mag-overlay">
      <div class="mag-top">
        <span class="mag-masthead" style="color:${spec.mastheadColor};">${spec.masthead}</span>
      </div>
      <div class="mag-mid-coverlines">
        ${spec.coverlines.map((line) => `<span class="mag-coverline">${line}</span>`).join('')}
      </div>
      <div class="mag-bottom-stack">
        ${stickerHtml}
        <span class="mag-headline">${spec.headline}</span>
        <span class="mag-barcode" aria-hidden="true"></span>
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
