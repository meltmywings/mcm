import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CampaignEvent, CaseStudy, SiteContent } from '../src/types/cms';
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
        caseStudies: state.caseStudies,
        campaigns: includeDrafts
          ? state.campaigns
          : state.campaigns.filter((item) => item.isActive),
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
        caseStudies?: CaseStudy[];
        campaigns?: CampaignEvent[];
      }>(req);

      const current = await loadCmsState();
      const updated = await saveCmsState({
        ...current,
        siteContent: body.siteContent
          ? { ...current.siteContent, ...body.siteContent }
          : current.siteContent,
        caseStudies: Array.isArray(body.caseStudies) ? body.caseStudies : current.caseStudies,
        campaigns: Array.isArray(body.campaigns) ? body.campaigns : current.campaigns,
      });

      sendJson(res, 200, {
        siteContent: updated.siteContent,
        caseStudies: updated.caseStudies,
        campaigns: updated.campaigns,
      });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid CMS payload' });
  }
}

