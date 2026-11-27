import type { CmsState } from '../../src/types/cms';

export const DEFAULT_CMS_STATE: CmsState = {
  siteContent: {
    brandTitle: 'MAIN CHARACTER MEDIA',
    brandSubtitle: 'CREATIVE MEDIA AGENCY',
    primaryCtaLabel: 'Launch a Campaign',
    secondaryCtaLabel: 'Explore Case Studies',
    workEyebrow: 'Cover Stories',
    workHeading: 'Campaigns that hijacked the feed.',
    workSubtitle: 'Filter by channel discipline or inspect the full editorial strategy behind each launch.',
    eventsEyebrow: 'On Now',
    eventsHeading: 'Live Campaigns & Events.',
    eventsSubtitle: 'Open creator castings, brand drops, and studio salons happening now.',
    servicesEyebrow: 'Capabilities',
    servicesHeading: 'Built for the feed, styled like a cover shoot.',
    servicesSubtitle:
      'Every discipline inside Main Character Media is structured around taste, cultural fluency, and measurable growth.',
    cultureEyebrow: 'Culture Lab',
    cultureHeading: 'How we turn attention into icon status.',
    cultureSubtitle:
      'Our three-part operating cadence blends glossy magazine instinct with weekly retention telemetry.',
    cultureQuote:
      '“Main Character Media turned our launch into a weekly feed ritual — 38K waitlist signups & 41% lower CPA in six weeks.”',
    cultureQuoteAuthor: 'Maya Lin-Vargas — VP Brand, Solstice',
    faqEyebrow: 'FAQ',
    faqHeading: 'Working with the studio.',
    faqSubtitle:
      'Answers to the most common questions on timelines, retainers, and creative production.',
    briefEyebrow: 'Start a Project',
    briefHeading: 'Put your brand in the spotlight.',
    briefSubtitle:
      'Tell us what you are launching, which channels matter most, and where you want to take market share. Our executive producers respond within one business day.',
    briefSubmitLabel: 'Launch Your Brief',
  },
  heroButtons: [
    { id: 'hero-primary-cta', label: 'Launch a Campaign', href: '#brief', variant: 'primary' },
    { id: 'hero-secondary-cta', label: 'Explore Case Studies', href: '#work', variant: 'secondary' },
  ],
  metrics: [
    { id: 'metric-views', value: '480M+', label: 'Organic & Paid Views Driven' },
    { id: 'metric-roas', value: '3.8x', label: 'Average Blended Social ROAS' },
    { id: 'metric-creators', value: '140+', label: 'Vetted Culture Creators' },
    { id: 'metric-launches', value: '42', label: 'Category-Defining Launches' },
  ],
  tickerItems: [
    'TIKTOK & REELS PRODUCTION',
    'CREATOR SEEDING ECOSYSTEMS',
    'CULTURAL MOMENT ENGINEERING',
    'PAID SOCIAL CREATIVE TESTING',
    'FOUNDER PERSONAL BRANDING',
    'COMMUNITY ARCHITECTURE',
  ],
  caseStudies: [
    {
      id: 'vespera-botanicals',
      client: 'Vespera Botanicals',
      sector: 'Clean Skincare',
      title: 'Turning a quiet shelfie serum into a 6-week sold-out ritual',
      channel: 'short-form',
      channelLabel: 'TikTok & Reels',
      headlineMetric: '64M Organic Views',
      secondaryMetric: '4.4x Launch ROAS',
      summary:
        'Episodic founder-POV storytelling and tactile ASMR texture drops that owned beauty TikTok in Q2.',
      challenge:
        'Vespera had strong clinical efficacy but zero cultural recognition among Gen-Z skincare buyers overwhelmed by clinical jargon.',
      strategy:
        'We built a 30-day "Nightstand Confessions" docu-series pairing macro texture shots with unscripted creator duets and comment-reply hooks.',
      deliverables: [
        '24 native short-form episodes',
        'Creator duet & stitch prompt kit',
        'Whitelisted Spark Ads creative matrix',
      ],
      accentColor: '#F4A6C1',
      references: [
        {
          id: 'ref-vespera-tiktok',
          platform: 'tiktok',
          label: 'Nightstand Confessions Ep. 01',
          url: 'https://www.tiktok.com/@vesperabotanicals',
          handle: '@vesperabotanicals',
        },
      ],
    },
    {
      id: 'kinetix-audio',
      client: 'Kinetix Audio',
      sector: 'Consumer Hardware',
      title: 'Mobilizing 85 underground DJs and runners for an open-ear drop',
      channel: 'creators',
      channelLabel: 'Creator Ecosystems',
      headlineMetric: '85 Creator Drops',
      secondaryMetric: '310% Earned Reach Lift',
      summary:
        'Street-cast micro-communities replaced polished tech reviews with raw city-run soundtracks and studio-session reels.',
      challenge:
        'Traditional tech YouTube sponsorships felt sterile and failed to communicate why runners and commuters would wear open-ear buds.',
      strategy:
        'We seeded custom serialized hardware kits to urban run clubs and bedroom producers, letting each creator score their own 45-second commute.',
      deliverables: [
        '85 seeded creator collaborations',
        'Run-club pop-up capture units',
        'Cross-platform sound-pack trend',
      ],
      accentColor: '#B9D7ED',
      references: [
        {
          id: 'ref-kinetix-ig',
          platform: 'instagram',
          label: 'City Run Soundtrack Series',
          url: 'https://www.instagram.com/',
          handle: '@kinetixaudio',
        },
      ],
    },
    {
      id: 'solstice-matcha',
      client: 'Solstice Matcha',
      sector: 'Modern Beverage',
      title: 'Engineering high-velocity paid social creative that beat rising CPMs',
      channel: 'paid-social',
      channelLabel: 'Paid Social & Launch',
      headlineMetric: '-41% Customer CPA',
      secondaryMetric: '$1.9M Tracked Revenue',
      summary:
        'Weekly modular hook sprints turned organic comment debates into top-performing Meta and TikTok acquisition ads.',
      challenge:
        'Rising acquisition costs stalled Solstice at $40 CPA with static studio photography losing thumb-stop rate.',
      strategy:
        'Our creative lab ran 12 rapid hook variations per week—testing cold-brew pours, cafe taste tests, and split-screen myth-busting.',
      deliverables: [
        'Weekly modular ad-hook sprints',
        'Creator UGC licensing pipeline',
        'Full-funnel retention creative',
      ],
      accentColor: '#D9C5E9',
    },
    {
      id: 'nocturne-denim',
      client: 'Nocturne Denim',
      sector: 'Contemporary Apparel',
      title: 'Building a zero-ad-spend waitlist of 38,000 fans before drop one',
      channel: 'creators',
      channelLabel: 'Creator Ecosystems',
      headlineMetric: '38K Waitlist Signups',
      secondaryMetric: '92% Sell-Through in 4h',
      summary:
        'Behind-the-seams atelier dispatches and stylist fit-check chains made every garment feel collectible.',
      challenge:
        'Launching a heavyweight selvedge label without legacy retail distribution meant earning obsessive pre-launch demand on social.',
      strategy:
        'We serialized the pattern-making journey across Instagram Broadcast Channels, Reels, and stylist capsule lookbooks.',
      deliverables: [
        'Serialized atelier video diary',
        'Stylist seeding & fit-check chain',
        'Broadcast channel drop mechanics',
      ],
      accentColor: '#F8D98B',
    },
  ],
  campaigns: [
    {
      id: 'camp-y2k-casting',
      title: 'Winter Cover Star Creator Casting',
      kind: 'Campaign',
      dateLabel: 'Nov – Dec 2026',
      location: 'NYC · LA · Remote',
      description:
        'Open casting for beauty, fashion, and lifestyle creators ready to front Q1 brand hero shoots and TikTok mini-series.',
      ctaLabel: 'Apply via Brief',
      ctaHref: '#brief',
      isActive: true,
    },
    {
      id: 'event-soho-salon',
      title: 'SoHo Social Salon & Hook Lab',
      kind: 'Event',
      dateLabel: 'Dec 12, 2026',
      location: 'New York Loft',
      description:
        'An intimate creator & brand founder evening dissecting short-form retention, seeding economics, and 2027 feed culture.',
      ctaLabel: 'Request Invite',
      ctaHref: '#brief',
      isActive: true,
    },
  ],
  services: [
    {
      id: 'srv-short-form',
      number: '01',
      title: 'Short-Form Studio',
      tagline: 'Thumb-stopping episodic storytelling',
      description:
        'Concepting, scripting, shooting, and editing native vertical video built for retention curves—not repurposed TV commercials.',
      outcomes: ['TikTok, Reels & YouTube Shorts', 'Episodic brand IP formats', '48-hour cultural trend response'],
    },
    {
      id: 'srv-creators',
      number: '02',
      title: 'Creator Ecosystems',
      tagline: 'Talent casting, seeding & co-creation',
      description:
        'We pair brands with voices audiences actually trust—managing briefing, usage rights, whitelisting, and ambassador programs.',
      outcomes: ['Micro-to-macro creator casting', 'Always-on gifting & seeding', 'Usage & Spark Ads amplification'],
    },
    {
      id: 'srv-community',
      number: '03',
      title: 'Community & Social Ops',
      tagline: 'Daily publishing with a distinct voice',
      description:
        'Your brand shows up in comments, broadcasts, and replies with wit and cultural fluency, turning passive scrollers into regulars.',
      outcomes: ['Channel strategy & editorial calendars', 'Active comment & DM community care', 'Founder & executive thought leadership'],
    },
    {
      id: 'srv-paid',
      number: '04',
      title: 'Paid Social Creative',
      tagline: 'Performance creative engineered to scale',
      description:
        'High-volume hook, body, and CTA testing matrices that feed Meta and TikTok algorithms fresh winners every single week.',
      outcomes: ['Modular UGC & studio ad sprints', 'Creative analytics & hook audits', 'Landing-angle alignment'],
    },
  ],
  processSteps: [
    {
      id: 'proc-01',
      step: '01',
      title: 'Signal & Character',
      description:
        'We audit your category tropes, comment sections, and cultural white space to define your brand’s unmistakable point of view.',
    },
    {
      id: 'proc-02',
      step: '02',
      title: 'Creator-Grade Production',
      description:
        'Lean shoot days and remote creator pods deliver dozens of native vertical cuts designed around first-3-second visual hooks.',
    },
    {
      id: 'proc-03',
      step: '03',
      title: 'Algorithmic Momentum',
      description:
        'Weekly retention teardowns tell us which storylines earned saves and shares—so every sprint compounds on the last.',
    },
  ],
  faqs: [
    {
      id: 'faq-retainer',
      question: 'Do you work on monthly retainers or campaign sprints?',
      answer:
        'Both. Most partners start with a 90-day Flagship Sprint to establish creative formats and test creator hooks, then transition into an ongoing monthly studio retainer covering production, community, and paid creative refreshes.',
    },
    {
      id: 'faq-production',
      question: 'Do we need to ship products to your studio for shoots?',
      answer:
        'Yes—for tactile product launches, you ship samples to our New York or Los Angeles production hubs (or directly to vetted creators in our network). We handle styling, casting, location scouting, and full post-production.',
    },
    {
      id: 'faq-metrics',
      question: 'How do you measure success beyond vanity views?',
      answer:
        'Every campaign tracks hold rate (3-second and 15-second retention), saves-per-reach, profile-to-site conversion, creator-attributed revenue, and blended CPA/ROAS across organic and whitelisted paid placements.',
    },
    {
      id: 'faq-timeline',
      question: 'How fast can Main Character Media launch a new account or campaign?',
      answer:
        'Discovery and voice architecture take 10 business days, with first creator kits shipped and studio production live by week three. By week four, your channels are publishing consistently.',
    },
  ],
  customSections: [],
  hiddenSections: [],
  pagePhotos: {
    cover: [{ id: 'ph-cover-1', src: '/magazines/mag-01.jpg', caption: 'Issue 01 Cover' }],
    metrics: [
      { id: 'ph-metrics-1', src: '/magazines/cutouts/mag-03.png', caption: 'Stage Edit' },
      { id: 'ph-metrics-2', src: '/magazines/cutouts/mag-05.png', caption: 'Floral Bag Drop' },
      { id: 'ph-metrics-3', src: '/magazines/cutouts/mag-09.png', caption: 'Studio Portrait' },
      { id: 'ph-metrics-4', src: '/magazines/cutouts/mag-11.png', caption: 'Backstage' },
    ],
    work: [
      { id: 'ph-work-1', src: '/magazines/cutouts/mag-02.png', caption: 'Runway Edit' },
      { id: 'ph-work-2', src: '/magazines/cutouts/mag-05.png', caption: 'Editorial Bag' },
      { id: 'ph-work-3', src: '/magazines/cutouts/mag-11.png', caption: 'Creator Press' },
      { id: 'ph-work-4', src: '/magazines/cutouts/mag-04.png', caption: 'Lookbook Duo' },
    ],
    'work-2': [
      { id: 'ph-work2-1', src: '/magazines/cutouts/mag-06.png', caption: 'Catwalk Moment' },
      { id: 'ph-work2-2', src: '/magazines/cutouts/mag-05.png', caption: 'Launch Drop' },
      { id: 'ph-work2-3', src: '/magazines/cutouts/mag-08.png', caption: 'Editorial Muse' },
      { id: 'ph-work2-4', src: '/magazines/cutouts/mag-15.png', caption: 'Press Feature' },
    ],
    events: [
      { id: 'ph-events-1', src: '/magazines/cutouts/mag-04.png', caption: 'Open Castings' },
      { id: 'ph-events-2', src: '/magazines/cutouts/mag-05.png', caption: 'Accessory Edit' },
      { id: 'ph-events-3', src: '/magazines/cutouts/mag-10.png', caption: 'Live Salon' },
      { id: 'ph-events-4', src: '/magazines/cutouts/mag-02.png', caption: 'Runway Front' },
    ],
    services: [
      { id: 'ph-services-1', src: '/magazines/cutouts/mag-05.png', caption: 'Styled Lookbook' },
      { id: 'ph-services-2', src: '/magazines/cutouts/mag-03.png', caption: 'Stage Shoot' },
      { id: 'ph-services-3', src: '/magazines/cutouts/mag-06.png', caption: 'Runway Shoot' },
      { id: 'ph-services-4', src: '/magazines/cutouts/mag-07.png', caption: 'Front Row' },
    ],
    'services-2': [
      { id: 'ph-services2-1', src: '/magazines/cutouts/mag-09.png', caption: 'Creator Desk' },
      { id: 'ph-services2-2', src: '/magazines/cutouts/mag-05.png', caption: 'Drop Bag' },
      { id: 'ph-services2-3', src: '/magazines/cutouts/mag-13.png', caption: 'London Edit' },
      { id: 'ph-services2-4', src: '/magazines/cutouts/mag-14.png', caption: 'Paid Lab' },
    ],
    'culture-lab': [
      { id: 'ph-culture-1', src: '/magazines/cutouts/mag-07.png', caption: 'Runway Study' },
      { id: 'ph-culture-2', src: '/magazines/cutouts/mag-05.png', caption: 'Floral Props' },
      { id: 'ph-culture-3', src: '/magazines/cutouts/mag-09.png', caption: 'Behind Lens' },
      { id: 'ph-culture-4', src: '/magazines/cutouts/mag-12.png', caption: 'Afterhours' },
    ],
    faq: [
      { id: 'ph-faq-1', src: '/magazines/cutouts/mag-12.png', caption: 'SoHo Edit' },
      { id: 'ph-faq-2', src: '/magazines/cutouts/mag-05.png', caption: 'Studio Prop' },
      { id: 'ph-faq-3', src: '/magazines/cutouts/mag-13.png', caption: 'London Walk' },
      { id: 'ph-faq-4', src: '/magazines/cutouts/mag-08.png', caption: 'Studio Q&A' },
    ],
    'faq-2': [
      { id: 'ph-faq2-1', src: '/magazines/cutouts/mag-14.png', caption: 'LA Production' },
      { id: 'ph-faq2-2', src: '/magazines/cutouts/mag-05.png', caption: 'Editorial Bag' },
      { id: 'ph-faq2-3', src: '/magazines/cutouts/mag-15.png', caption: 'Editors Pick' },
      { id: 'ph-faq2-4', src: '/magazines/cutouts/mag-10.png', caption: 'Launch Week' },
    ],
    brief: [
      { id: 'ph-brief-1', src: '/magazines/cutouts/mag-14.png', caption: 'New Business' },
      { id: 'ph-brief-2', src: '/magazines/cutouts/mag-05.png', caption: 'Campaign Prop' },
      { id: 'ph-brief-3', src: '/magazines/cutouts/mag-02.png', caption: 'Casting Call' },
      { id: 'ph-brief-4', src: '/magazines/cutouts/mag-08.png', caption: 'Studio Desk' },
    ],
    directory: [
      { id: 'ph-dir-1', src: '/magazines/cutouts/mag-15.png', caption: 'Back Cover' },
      { id: 'ph-dir-2', src: '/magazines/cutouts/mag-05.png', caption: 'Press Kit' },
      { id: 'ph-dir-3', src: '/magazines/cutouts/mag-03.png', caption: 'NY · LA · LDN' },
      { id: 'ph-dir-4', src: '/magazines/cutouts/mag-11.png', caption: 'Issue 01 End' },
    ],
  },
  pageTextBlocks: {},
  clients: [
    {
      id: 'cl-vespera',
      name: 'Vespera Botanicals',
      handle: '@vesperabotanicals',
      email: 'team@vespera.co',
      retainer: '$25k–$50k / mo',
      status: 'active',
      notes: 'Q4 holiday gifting creator matrix approved.',
      updatedAt: '2026-11-24T12:00:00Z',
    },
    {
      id: 'cl-solstice',
      name: 'Solstice Matcha',
      handle: '@solsticematcha',
      email: 'growth@solsticematcha.com',
      retainer: '$50k+ / mo',
      status: 'active',
      notes: 'Weekly paid hook sprint delivering -41% CPA.',
      updatedAt: '2026-11-25T09:30:00Z',
    },
    {
      id: 'cl-lumiere',
      name: 'Lumiere Gloss Co.',
      handle: '@lumieregloss',
      email: 'founders@lumieregloss.co',
      retainer: 'Single Launch Sprint',
      status: 'pending',
      notes: 'Awaiting product sample shipment for studio shoot.',
      updatedAt: '2026-11-25T15:10:00Z',
    },
  ],
  submissions: [
    {
      id: 'sub-initial-1',
      fullName: 'Chloe Vance',
      email: 'chloe@velvetclub.co',
      brand: '@velvetclub',
      budget: '25k-50k',
      channels: ['tiktok', 'instagram', 'creators'],
      notes: 'Looking for a 90-day TikTok & creator seeding sprint ahead of our January resort capsule drop.',
      status: 'new',
      createdAt: '2026-11-25T14:20:00Z',
    },
  ],
};
