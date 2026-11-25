import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClientRecord, ClientStatus } from '../src/types/cms';
import { isAuthenticated, readJsonBody, sendJson } from './_lib/auth';
import { loadCmsState, saveCmsState } from './_lib/store';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isAuthenticated(req)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  try {
    const state = await loadCmsState();

    if (req.method === 'GET') {
      sendJson(res, 200, { clients: state.clients });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody<Partial<ClientRecord>>(req);
      const name = String(body.name || '').trim();
      const handle = String(body.handle || '').trim();
      const email = String(body.email || '').trim();
      if (!name || !email) {
        sendJson(res, 400, { error: 'Client name and email are required.' });
        return;
      }

      const client: ClientRecord = {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        name,
        handle: handle || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        email,
        retainer: String(body.retainer || 'Single Launch Sprint').trim(),
        status: (body.status as ClientStatus) || 'pending',
        notes: String(body.notes || '').trim(),
        updatedAt: new Date().toISOString(),
      };

      const next = await saveCmsState({
        ...state,
        clients: [client, ...state.clients],
      });
      sendJson(res, 201, { client, clients: next.clients });
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody<{
        id?: string;
        status?: ClientStatus;
        notes?: string;
        retainer?: string;
      }>(req);

      if (!body.id) {
        sendJson(res, 400, { error: 'Client ID is required.' });
        return;
      }

      const updatedClients = state.clients.map((item) =>
        item.id === body.id
          ? {
              ...item,
              status: body.status ?? item.status,
              notes: body.notes !== undefined ? body.notes : item.notes,
              retainer: body.retainer !== undefined ? body.retainer : item.retainer,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );

      const next = await saveCmsState({ ...state, clients: updatedClients });
      sendJson(res, 200, { clients: next.clients });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody<{ id?: string }>(req);
      if (!body.id) {
        sendJson(res, 400, { error: 'Client ID is required.' });
        return;
      }
      const next = await saveCmsState({
        ...state,
        clients: state.clients.filter((item) => item.id !== body.id),
      });
      sendJson(res, 200, { clients: next.clients });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid client payload' });
  }
}

