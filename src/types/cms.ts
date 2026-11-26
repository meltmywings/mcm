export type ChannelFilter = 'all' | 'short-form' | 'creators' | 'paid-social';

export type MediaPlatform = 'tiktok' | 'instagram' | 'youtube' | 'link';

export interface MediaReference {
  id: string;
  platform: MediaPlatform;
  label: string;
  url: string;
  handle?: string;
  caption?: string;
}

export interface HeroButton {
  id: string;
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export interface MetricItem {
  id: string;
  value: string;
  label: string;
}

export interface ServicePillar {
  id?: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  outcomes: string[];
}

export interface ProcessStep {
  id?: string;
  step: string;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export type CustomElement =
  | {
      id: string;
      type: 'text';
      title: string;
      body: string;
    }
  | {
      id: string;
      type: 'button';
      label: string;
      href: string;
      variant: 'primary' | 'secondary';
    }
  | {
      id: string;
      type: 'reference';
      platform: MediaPlatform;
      title: string;
      url: string;
      handle: string;
      caption: string;
    };

export interface CustomSection {
  id: string;
  eyebrow: string;
  heading: string;
  subtitle: string;
  elements: CustomElement[];
}

export interface MagazinePhoto {
  id: string;
  src: string;
  caption?: string;
}

export interface PageTextBlock {
  id: string;
  title?: string;
  body: string;
  style?: 'article' | 'pullquote';
}

export type BuiltinSectionKey =
  | 'hero'
  | 'metrics'
  | 'ticker'
  | 'work'
  | 'events'
  | 'services'
  | 'culture-lab'
  | 'faq'
  | 'brief';

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
  references?: MediaReference[];
}

export interface SiteContent {
  brandTitle: string;
  brandSubtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  workEyebrow?: string;
  workHeading: string;
  workSubtitle: string;
  eventsEyebrow?: string;
  eventsHeading?: string;
  eventsSubtitle?: string;
  servicesEyebrow?: string;
  servicesHeading: string;
  servicesSubtitle?: string;
  cultureEyebrow?: string;
  cultureHeading?: string;
  cultureSubtitle?: string;
  cultureQuote: string;
  cultureQuoteAuthor: string;
  faqEyebrow?: string;
  faqHeading?: string;
  faqSubtitle?: string;
  briefEyebrow?: string;
  briefHeading?: string;
  briefSubtitle?: string;
  briefSubmitLabel?: string;
}

export type ClientStatus = 'pending' | 'approved' | 'active' | 'paused' | 'flagged';

export interface ClientRecord {
  id: string;
  name: string;
  handle: string;
  email: string;
  retainer: string;
  status: ClientStatus;
  notes: string;
  updatedAt: string;
}

export type SubmissionStatus = 'new' | 'reviewed' | 'approved' | 'archived';

export interface SubmissionRecord {
  id: string;
  fullName: string;
  email: string;
  brand: string;
  budget: string;
  channels: string[];
  notes: string;
  status: SubmissionStatus;
  createdAt: string;
}

export type CampaignKind = 'Campaign' | 'Event' | 'Drop';

export interface CampaignEvent {
  id: string;
  title: string;
  kind: CampaignKind;
  dateLabel: string;
  location: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  references?: MediaReference[];
}

export interface CmsState {
  siteContent: SiteContent;
  heroButtons: HeroButton[];
  metrics: MetricItem[];
  tickerItems: string[];
  caseStudies: CaseStudy[];
  campaigns: CampaignEvent[];
  services: ServicePillar[];
  processSteps: ProcessStep[];
  faqs: FaqItem[];
  customSections: CustomSection[];
  hiddenSections: BuiltinSectionKey[];
  pagePhotos: Record<string, MagazinePhoto[]>;
  pageTextBlocks: Record<string, PageTextBlock[]>;
  clients: ClientRecord[];
  submissions: SubmissionRecord[];
}
