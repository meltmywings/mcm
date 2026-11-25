export type ChannelFilter = 'all' | 'short-form' | 'creators' | 'paid-social';

export interface CaseStudy {
  id: string;
  client: string;
  sector: string;
  title: string;
  channel: Exclude<ChannelFilter, 'all'>;
  channelLabel: string;
  headlineMetric: string;
  secondaryMetric: string;
  summary: string;
  challenge: string;
  strategy: string;
  deliverables: string[];
  accentColor: string;
}

export interface ServicePillar {
  number: string;
  title: string;
  tagline: string;
  description: string;
  outcomes: string[];
}

export interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BudgetTier {
  id: string;
  value: string;
  label: string;
}

export const AGENCY_METRICS = [
  { value: '480M+', label: 'Organic & Paid Views Driven' },
  { value: '3.8x', label: 'Average Blended Social ROAS' },
  { value: '140+', label: 'Vetted Culture Creators' },
  { value: '42', label: 'Category-Defining Launches' },
] as const;

export const TICKER_ITEMS = [
  'TIKTOK & REELS PRODUCTION',
  'CREATOR SEEDING ECOSYSTEMS',
  'CULTURAL MOMENT ENGINEERING',
  'PAID SOCIAL CREATIVE TESTING',
  'FOUNDER PERSONAL BRANDING',
  'COMMUNITY ARCHITECTURE',
] as const;

export const CASE_STUDIES: CaseStudy[] = [
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
];

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    number: '01',
    title: 'Short-Form Studio',
    tagline: 'Thumb-stopping episodic storytelling',
    description:
      'Concepting, scripting, shooting, and editing native vertical video built for retention curves—not repurposed TV commercials.',
    outcomes: ['TikTok, Reels & YouTube Shorts', 'Episodic brand IP formats', '48-hour cultural trend response'],
  },
  {
    number: '02',
    title: 'Creator Ecosystems',
    tagline: 'Talent casting, seeding & co-creation',
    description:
      'We pair brands with voices audiences actually trust—managing briefing, usage rights, whitelisting, and ambassador programs.',
    outcomes: ['Micro-to-macro creator casting', 'Always-on gifting & seeding', 'Usage & Spark Ads amplification'],
  },
  {
    number: '03',
    title: 'Community & Social Ops',
    tagline: 'Daily publishing with a distinct voice',
    description:
      'Your brand shows up in comments, broadcasts, and replies with wit and cultural fluency, turning passive scrollers into regulars.',
    outcomes: ['Channel strategy & editorial calendars', 'Active comment & DM community care', 'Founder & executive thought leadership'],
  },
  {
    number: '04',
    title: 'Paid Social Creative',
    tagline: 'Performance creative engineered to scale',
    description:
      'High-volume hook, body, and CTA testing matrices that feed Meta and TikTok algorithms fresh winners every single week.',
    outcomes: ['Modular UGC & studio ad sprints', 'Creative analytics & hook audits', 'Landing-angle alignment'],
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    step: '01',
    title: 'Signal & Character',
    description:
      'We audit your category tropes, comment sections, and cultural white space to define your brand’s unmistakable point of view.',
  },
  {
    step: '02',
    title: 'Creator-Grade Production',
    description:
      'Lean shoot days and remote creator pods deliver dozens of native vertical cuts designed around first-3-second visual hooks.',
  },
  {
    step: '03',
    title: 'Algorithmic Momentum',
    description:
      'Weekly retention teardowns tell us which storylines earned saves and shares—so every sprint compounds on the last.',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
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
];

export const BUDGET_TIERS: BudgetTier[] = [
  { id: 'budget-15k', value: '15k-25k', label: '$15k–$25k / mo' },
  { id: 'budget-25k', value: '25k-50k', label: '$25k–$50k / mo' },
  { id: 'budget-50k', value: '50k-plus', label: '$50k+ / mo' },
  { id: 'budget-sprint', value: 'sprint', label: 'Single Launch Sprint' },
];

export const CHANNEL_OPTIONS = [
  { id: 'ch-tiktok', value: 'tiktok', label: 'TikTok' },
  { id: 'ch-instagram', value: 'instagram', label: 'Instagram Reels' },
  { id: 'ch-youtube', value: 'youtube', label: 'YouTube Shorts' },
  { id: 'ch-creators', value: 'creators', label: 'Creator Seeding' },
  { id: 'ch-paid', value: 'paid', label: 'Paid Social' },
] as const;

