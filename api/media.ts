import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { get, put } from '@vercel/blob';
import { isAuthenticated, readJsonBody, sendJson } from './_lib/auth';
import { hasBlobStore } from './_lib/store';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MEDIA_PREFIX = 'media/';

function getLocalMediaDir(): string {
  return process.env.VERCEL ? path.join(os.tmpdir(), 'mcm-media') : path.join(process.cwd(), '.data', 'media');
}

function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '');
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url || '/api/media', 'http://localhost');
      const id = safeId(url.searchParams.get('id') || '');
      if (!id) {
        res.statusCode = 400;
        res.end('Missing media id');
        return;
      }

      if (hasBlobStore()) {
        const result = await get(`${MEDIA_PREFIX}${id}`, { access: 'private', useCache: true });
        if (!result || result.statusCode !== 200 || !result.stream) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
        res.statusCode = 200;
        res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(buf);
        return;
      }

      const filePath = path.join(getLocalMediaDir(), id);
      const buf = await fs.readFile(filePath).catch(() => null);
      if (!buf) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const ext = path.extname(id).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/jpeg';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(buf);
      return;
    }

    if (req.method === 'POST') {
      if (!isAuthenticated(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const body = await readJsonBody<{
        contentType?: string;
        dataBase64?: string;
      }>(req);

      const mime = String(body.contentType || '').toLowerCase().trim();
      const ext = ALLOWED_TYPES[mime];
      if (!ext) {
        sendJson(res, 400, { error: 'Unsupported image type. Use JPG, PNG, WebP, or GIF.' });
        return;
      }

      const rawBase64 = String(body.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
      if (!rawBase64) {
        sendJson(res, 400, { error: 'Missing image payload.' });
        return;
      }

      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.byteLength === 0 || buffer.byteLength > 4 * 1024 * 1024) {
        sendJson(res, 400, { error: 'Image must be under 4 MB.' });
        return;
      }

      const mediaId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      if (hasBlobStore()) {
        await put(`${MEDIA_PREFIX}${mediaId}`, buffer, {
          access: 'private',
          contentType: mime,
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      } else {
        const dir = getLocalMediaDir();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, mediaId), buffer);
      }

      sendJson(res, 201, { ok: true, url: `/api/media?id=${encodeURIComponent(mediaId)}` });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch {
    sendJson(res, 400, { error: 'Invalid media request' });
  }
}
