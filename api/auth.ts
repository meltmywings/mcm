import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  clearSessionCookie,
  createSessionToken,
  isAuthenticated,
  readJsonBody,
  sendJson,
  setSessionCookie,
  verifyPasscode,
} from './_lib/auth';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      sendJson(res, 200, { authenticated: isAuthenticated(req) });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody<{ password?: string }>(req);
      const password = typeof body.password === 'string' ? body.password : '';
      const result = verifyPasscode(password);

      if (result.misconfigured) {
        sendJson(res, 503, { error: 'Server passcode environment variable is not configured.' });
        return;
      }

      if (!result.ok) {
        sendJson(res, 401, { error: 'Incorrect studio passcode.' });
        return;
      }

      const token = createSessionToken();
      if (!token) {
        sendJson(res, 503, { error: 'Unable to initialize studio session.' });
        return;
      }

      setSessionCookie(res, token);
      sendJson(res, 200, { authenticated: true });
      return;
    }

    if (req.method === 'DELETE') {
      clearSessionCookie(res);
      sendJson(res, 200, { authenticated: false });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid request payload' });
  }
}

