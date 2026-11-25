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

export interface SiteContent {
  brandTitle: string;
  brandSubtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  workHeading: string;
  workSubtitle: string;
  servicesHeading: string;
  cultureQuote: string;
  cultureQuoteAuthor: string;
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
}

export interface CmsState {
  siteContent: SiteContent;
  caseStudies: CaseStudy[];
  campaigns: CampaignEvent[];
  clients: ClientRecord[];
  submissions: SubmissionRecord[];
}

