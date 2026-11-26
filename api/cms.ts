import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  BuiltinSectionKey,
  CampaignEvent,
  CaseStudy,
  CustomSection,
  FaqItem,
  HeroButton,
  MagazinePhoto,
  MetricItem,
  PageTextBlock,
  ProcessStep,
  ServicePillar,
  SiteContent,
} from '../src/types/cms';
import { isAuthenticated, readJsonBody, sendJson } from './_lib/auth';
import { loadCmsState, saveCmsState } from './_lib/store';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      const state = await loadCmsState();
      const url = new URL(req.url || '/api/cms', 'http://localhost');
      const includeDrafts = url.searchParams.get('admin') === '1' && isAuthenticated(req);

      sendJson(res, 200, {
        siteContent: state.siteContent,
        heroButtons: state.heroButtons,
        metrics: state.metrics,
        tickerItems: state.tickerItems,
        caseStudies: state.caseStudies,
        campaigns: includeDrafts
          ? state.campaigns
          : state.campaigns.filter((item) => item.isActive),
        services: state.services,
        processSteps: state.processSteps,
        faqs: state.faqs,
        customSections: state.customSections,
        hiddenSections: state.hiddenSections,
        pagePhotos: state.pagePhotos,
        pageTextBlocks: state.pageTextBlocks,
      });
      return;
    }

    if (req.method === 'PUT') {
      if (!isAuthenticated(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const body = await readJsonBody<{
        siteContent?: Partial<SiteContent>;
        heroButtons?: HeroButton[];
        metrics?: MetricItem[];
        tickerItems?: string[];
        caseStudies?: CaseStudy[];
        campaigns?: CampaignEvent[];
        services?: ServicePillar[];
        processSteps?: ProcessStep[];
        faqs?: FaqItem[];
        customSections?: CustomSection[];
        hiddenSections?: BuiltinSectionKey[];
        pagePhotos?: Record<string, MagazinePhoto[]>;
        pageTextBlocks?: Record<string, PageTextBlock[]>;
      }>(req);

      const current = await loadCmsState();
      const updated = await saveCmsState({
        ...current,
        siteContent: body.siteContent
          ? { ...current.siteContent, ...body.siteContent }
          : current.siteContent,
        heroButtons: Array.isArray(body.heroButtons) ? body.heroButtons : current.heroButtons,
        metrics: Array.isArray(body.metrics) ? body.metrics : current.metrics,
        tickerItems: Array.isArray(body.tickerItems) ? body.tickerItems : current.tickerItems,
        caseStudies: Array.isArray(body.caseStudies) ? body.caseStudies : current.caseStudies,
        campaigns: Array.isArray(body.campaigns) ? body.campaigns : current.campaigns,
        services: Array.isArray(body.services) ? body.services : current.services,
        processSteps: Array.isArray(body.processSteps) ? body.processSteps : current.processSteps,
        faqs: Array.isArray(body.faqs) ? body.faqs : current.faqs,
        customSections: Array.isArray(body.customSections)
          ? body.customSections
          : current.customSections,
        hiddenSections: Array.isArray(body.hiddenSections)
          ? body.hiddenSections
          : current.hiddenSections,
        pagePhotos:
          body.pagePhotos && typeof body.pagePhotos === 'object'
            ? body.pagePhotos
            : current.pagePhotos,
        pageTextBlocks:
          body.pageTextBlocks && typeof body.pageTextBlocks === 'object'
            ? body.pageTextBlocks
            : current.pageTextBlocks,
      });

      sendJson(res, 200, {
        siteContent: updated.siteContent,
        heroButtons: updated.heroButtons,
        metrics: updated.metrics,
        tickerItems: updated.tickerItems,
        caseStudies: updated.caseStudies,
        campaigns: updated.campaigns,
        services: updated.services,
        processSteps: updated.processSteps,
        faqs: updated.faqs,
        customSections: updated.customSections,
        hiddenSections: updated.hiddenSections,
        pagePhotos: updated.pagePhotos,
        pageTextBlocks: updated.pageTextBlocks,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid CMS payload' });
  }
}
