import { DEFAULT_CMS_STATE } from '../../api/_lib/defaultState';
export type {
  BuiltinSectionKey,
  CampaignEvent,
  CampaignKind,
  CaseStudy,
  ChannelFilter,
  ClientRecord,
  ClientStatus,
  CmsState,
  CustomElement,
  CustomSection,
  FaqItem,
  HeroButton,
  MagazinePhoto,
  MediaPlatform,
  MediaReference,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
  SubmissionRecord,
  SubmissionStatus,
} from '../types/cms';

export interface BudgetTier {
  id: string;
  value: string;
  label: string;
}

export const AGENCY_METRICS = DEFAULT_CMS_STATE.metrics;
export const TICKER_ITEMS = DEFAULT_CMS_STATE.tickerItems;
export const DEFAULT_SITE_CONTENT = DEFAULT_CMS_STATE.siteContent;
export const DEFAULT_HERO_BUTTONS = DEFAULT_CMS_STATE.heroButtons;
export const CASE_STUDIES = DEFAULT_CMS_STATE.caseStudies;
export const DEFAULT_CAMPAIGNS = DEFAULT_CMS_STATE.campaigns;
export const SERVICE_PILLARS = DEFAULT_CMS_STATE.services;
export const PROCESS_STEPS = DEFAULT_CMS_STATE.processSteps;
export const FAQ_ITEMS = DEFAULT_CMS_STATE.faqs;
export const DEFAULT_PAGE_PHOTOS = DEFAULT_CMS_STATE.pagePhotos;
export const DEFAULT_PAGE_TEXT_BLOCKS = DEFAULT_CMS_STATE.pageTextBlocks;

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
