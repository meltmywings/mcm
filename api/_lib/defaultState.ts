import type { CmsState } from '../../src/types/cms';

export const DEFAULT_CMS_STATE: CmsState = {
  siteContent: {
    brandTitle: 'MAIN CHARACTER MEDIA',
    brandSubtitle: 'CREATIVE MEDIA AGENCY',
    primaryCtaLabel: 'Launch a Campaign',
    secondaryCtaLabel: 'Explore Case Studies',
    workHeading: 'Campaigns that hijacked the feed.',
    workSubtitle: 'Filter by channel discipline or inspect the full editorial strategy behind each launch.',
    servicesHeading: 'Built for the feed, styled like a cover shoot.',
    cultureQuote:
      '“Main Character Media gave us a voice people actively waited for in their feeds. Within six weeks, our waitlist grew by 38,000 and paid acquisition costs dropped by 41%.”',
    cultureQuoteAuthor: 'Maya Lin-Vargas — VP of Brand, Solstice & Nocturne Group',
  },
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

