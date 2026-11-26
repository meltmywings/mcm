import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SubmissionRecord, SubmissionStatus } from '../src/types/cms';
import { isAuthenticated, readJsonBody, sendJson } from './_lib/auth';
import {
  SUBMISSION_RETENTION_DAYS,
  createSubmission,
  deleteSubmission,
  loadSubmissions,
  updateSubmissionStatus,
} from './_lib/store';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
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

      await createSubmission(submission);

      sendJson(res, 201, { ok: true, submission, retentionDays: SUBMISSION_RETENTION_DAYS });
      return;
    }

    if (!isAuthenticated(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const submissions = await loadSubmissions();
      sendJson(res, 200, { submissions, retentionDays: SUBMISSION_RETENTION_DAYS });
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody<{ id?: string; status?: SubmissionStatus }>(req);
      if (!body.id || !body.status) {
        sendJson(res, 400, { error: 'Submission ID and status are required.' });
        return;
      }

      const submissions = await updateSubmissionStatus(body.id, body.status);
      sendJson(res, 200, { submissions, retentionDays: SUBMISSION_RETENTION_DAYS });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody<{ id?: string }>(req);
      if (!body.id) {
        sendJson(res, 400, { error: 'Submission ID is required.' });
        return;
      }

      const submissions = await deleteSubmission(body.id);
      sendJson(res, 200, { submissions, retentionDays: SUBMISSION_RETENTION_DAYS });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid submission payload' });
  }
}
