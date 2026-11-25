import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SubmissionRecord, SubmissionStatus } from '../src/types/cms';
import { isAuthenticated, readJsonBody, sendJson } from './_lib/auth';
import { loadCmsState, saveCmsState } from './_lib/store';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const state = await loadCmsState();

    if (req.method === 'POST') {
      const body = await readJsonBody<Partial<SubmissionRecord>>(req);
      const fullName = String(body.fullName || '').trim();
      const email = String(body.email || '').trim();
      const brand = String(body.brand || '').trim();
      const notes = String(body.notes || '').trim();

      if (fullName.length < 2 || !email.includes('@') || !brand || notes.length < 20) {
        sendJson(res, 400, { error: 'Please complete all required campaign brief fields.' });
        return;
      }

      const submission: SubmissionRecord = {
        id: `sub-${crypto.randomUUID().slice(0, 8)}`,
        fullName,
        email,
        brand,
        budget: String(body.budget || '15k-25k'),
        channels: Array.isArray(body.channels) ? body.channels.map(String) : [],
        notes,
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      await saveCmsState({
        ...state,
        submissions: [submission, ...state.submissions],
      });

      sendJson(res, 201, { ok: true, submission });
      return;
    }

    if (!isAuthenticated(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, { submissions: state.submissions });
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody<{ id?: string; status?: SubmissionStatus }>(req);
      if (!body.id || !body.status) {
        sendJson(res, 400, { error: 'Submission ID and status are required.' });
        return;
      }

      const next = await saveCmsState({
        ...state,
        submissions: state.submissions.map((item) =>
          item.id === body.id ? { ...item, status: body.status! } : item,
        ),
      });
      sendJson(res, 200, { submissions: next.submissions });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody<{ id?: string }>(req);
      if (!body.id) {
        sendJson(res, 400, { error: 'Submission ID is required.' });
        return;
      }
      const next = await saveCmsState({
        ...state,
        submissions: state.submissions.filter((item) => item.id !== body.id),
      });
      sendJson(res, 200, { submissions: next.submissions });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid submission payload' });
  }
}

