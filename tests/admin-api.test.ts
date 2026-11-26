import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken, verifyPasscode, verifySessionToken } from '../api/_lib/auth';
import {
  SUBMISSION_RETENTION_DAYS,
  isSubmissionActive,
  pruneAndSortSubmissions,
} from '../api/_lib/store';
import authHandler from '../api/auth';
import clientsHandler from '../api/clients';
import cmsHandler from '../api/cms';
import mediaHandler from '../api/media';
import submissionsHandler from '../api/submissions';
import {
  applyHiddenSections,
  applySiteContent,
  renderCampaigns,
  renderCustomSections,
  renderHeroButtons,
} from '../src/scripts/cmsView';

function createMockReq(options: {
  method: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): IncomingMessage {
  const chunks =
    options.body !== undefined ? [Buffer.from(JSON.stringify(options.body), 'utf8')] : [];
  const stream = Readable.from(chunks) as unknown as IncomingMessage;
  stream.method = options.method;
  stream.url = options.url ?? '/';
  stream.headers = options.headers ?? {};
  return stream;
}

interface MockResponse {
  res: ServerResponse;
  statusCode: number;
  headers: Record<string, string | string[]>;
  json: () => any;
}

function createMockRes(): MockResponse {
  const state: MockResponse = {
    res: null as unknown as ServerResponse,
    statusCode: 200,
    headers: {},
    json: () => ({}),
  };

  let rawBody = '';
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string | string[]) {
      state.headers[name.toLowerCase()] = value;
    },
    end(chunk?: string | Buffer) {
      if (chunk) rawBody += chunk.toString();
      state.statusCode = res.statusCode;
    },
  } as unknown as ServerResponse;

  state.res = res;
  state.json = () => (rawBody ? JSON.parse(rawBody) : {});
  return state;
}

function collectFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|js|html|css|json|svg)$/i.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Studio Portal Auth, API endpoints, security & live CMS DOM updates', () => {
  const originalPassword = process.env.MCM_ADMIN_PASSWORD;
  const originalKvUrl = process.env.KV_REST_API_URL;
  const originalKvToken = process.env.KV_REST_API_TOKEN;
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const originalBlobStoreId = process.env.BLOB_STORE_ID;
  const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
  const tmpStore = '/tmp/mcm-cms-state.json';

  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL_OIDC_TOKEN;
    if (fs.existsSync(tmpStore)) {
      fs.unlinkSync(tmpStore);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPassword === undefined) delete process.env.MCM_ADMIN_PASSWORD;
    else process.env.MCM_ADMIN_PASSWORD = originalPassword;

    if (originalKvUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = originalKvUrl;

    if (originalKvToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = originalKvToken;

    if (originalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;

    if (originalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;

    if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;

    if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
    else process.env.BLOB_STORE_ID = originalBlobStoreId;

    if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;

    if (fs.existsSync(tmpStore)) {
      fs.unlinkSync(tmpStore);
    }
    document.body.innerHTML = '';
  });

  it('rejects missing env passcode as misconfigured, rejects wrong passcodes, and signs/verifies session tokens', () => {
    delete process.env.MCM_ADMIN_PASSWORD;
    expect(verifyPasscode('anything')).toEqual({ ok: false, misconfigured: true });

    const testSecret = `env-secret-${Math.random().toString(36).slice(2)}`;
    process.env.MCM_ADMIN_PASSWORD = testSecret;

    expect(verifyPasscode('wrong-passcode')).toEqual({ ok: false });
    expect(verifyPasscode(testSecret)).toEqual({ ok: true });

    const token = createSessionToken();
    expect(token).toBeTruthy();
    expect(verifySessionToken(token!)).toBe(true);
    expect(verifySessionToken(`${token!}tampered`)).toBe(false);
    expect(verifySessionToken('invalid.token')).toBe(false);

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 60 * 24 * 8);
    expect(verifySessionToken(token!)).toBe(false);
  });

  it('never leaks the studio passcode literal in source, HTML, public assets, or API files', () => {
    const root = path.resolve(process.cwd());
    const targetFiles = [
      path.join(root, 'index.html'),
      path.join(root, 'admin.html'),
      ...collectFiles(path.join(root, 'src')),
      ...collectFiles(path.join(root, 'public')),
      ...collectFiles(path.join(root, 'api')),
    ];
    const forbidden = ['Money', 'gang'].join('');

    for (const file of targetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('does not expose admin portal links on index.html and keeps minimal password overlay over workspace in admin.html', () => {
    const root = path.resolve(process.cwd());
    const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');

    expect(indexHtml).not.toContain('admin.html');
    expect(indexHtml).not.toContain('/admin');
    expect(indexHtml).not.toContain('Studio Portal');

    expect(adminHtml).toContain('id="auth-gate"');
    expect(adminHtml).toContain('id="admin-workspace" class="workspace is-locked"');
    expect(adminHtml).not.toContain('Executive Access');
  });

  it('requires authentication for admin mutations and protected endpoints, while serving active public CMS data and accepting briefs', async () => {
    const testSecret = `studio-pass-${Math.random().toString(36).slice(2)}`;
    process.env.MCM_ADMIN_PASSWORD = testSecret;

    // 1. Unauthenticated protected checks return 401
    const unauthPut = createMockRes();
    await cmsHandler(
      createMockReq({ method: 'PUT', body: { siteContent: { brandTitle: 'Hacked' } } }),
      unauthPut.res,
    );
    expect(unauthPut.statusCode).toBe(401);

    const unauthClients = createMockRes();
    await clientsHandler(createMockReq({ method: 'GET' }), unauthClients.res);
    expect(unauthClients.statusCode).toBe(401);

    const unauthSubmissions = createMockRes();
    await submissionsHandler(createMockReq({ method: 'GET' }), unauthSubmissions.res);
    expect(unauthSubmissions.statusCode).toBe(401);

    // 2. Public POST /api/submissions validates & records a brief
    const badSubmission = createMockRes();
    await submissionsHandler(
      createMockReq({ method: 'POST', body: { fullName: 'A', email: 'bad', brand: '', notes: 'short' } }),
      badSubmission.res,
    );
    expect(badSubmission.statusCode).toBe(400);

    const validSubmission = createMockRes();
    await submissionsHandler(
      createMockReq({
        method: 'POST',
        body: {
          fullName: 'Sienna Park',
          email: 'sienna@brand.example',
          brand: 'Silk Note',
          budget: '25k-50k',
          channels: ['TikTok & Reels'],
          notes: 'Launching our autumn editorial drop across London and New York.',
        },
      }),
      validSubmission.res,
    );
    expect(validSubmission.statusCode).toBe(201);
    expect(validSubmission.json().ok).toBe(true);

    // 3. Log in via POST /api/auth
    const loginRes = createMockRes();
    await authHandler(
      createMockReq({ method: 'POST', body: { password: testSecret } }),
      loginRes.res,
    );
    expect(loginRes.statusCode).toBe(200);
    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : String(setCookie).split(';')[0];
    expect(cookieHeader).toContain('mcm_admin_session=');

    // 4. Authenticated GET /api/submissions sees the stored brief
    const authSubs = createMockRes();
    await submissionsHandler(
      createMockReq({ method: 'GET', headers: { cookie: cookieHeader } }),
      authSubs.res,
    );
    expect(authSubs.statusCode).toBe(200);
    expect(authSubs.json().submissions[0].fullName).toBe('Sienna Park');

    // 5. Authenticated PUT /api/cms saves active & draft campaigns, and public GET /api/cms only returns active campaigns
    const putCms = createMockRes();
    await cmsHandler(
      createMockReq({
        method: 'PUT',
        headers: { cookie: cookieHeader },
        body: {
          siteContent: { workHeading: 'Featured Cultural Runs' },
          campaigns: [
            {
              id: 'cmp-live',
              title: 'Live Runway Popup',
              kind: 'Campaign',
              dateLabel: 'Dec 10',
              location: 'SoHo, NY',
              description: 'Pop-up installation and creator salon.',
              ctaLabel: 'RSVP',
              ctaHref: '#brief',
              isActive: true,
            },
            {
              id: 'cmp-draft',
              title: 'Hidden Draft Activation',
              kind: 'Event',
              dateLabel: 'Jan 15',
              location: 'Paris',
              description: 'Not yet public.',
              ctaLabel: 'Apply',
              ctaHref: '#brief',
              isActive: false,
            },
          ],
        },
      }),
      putCms.res,
    );
    expect(putCms.statusCode).toBe(200);

    const publicCms = createMockRes();
    await cmsHandler(createMockReq({ method: 'GET', url: '/api/cms' }), publicCms.res);
    expect(publicCms.statusCode).toBe(200);
    expect(publicCms.json().siteContent.workHeading).toBe('Featured Cultural Runs');
    expect(publicCms.json().campaigns).toHaveLength(1);
    expect(publicCms.json().campaigns[0].id).toBe('cmp-live');
    expect(publicCms.json().clients).toBeUndefined();
    expect(publicCms.json().submissions).toBeUndefined();
  });

  it('applies CMS siteContent and renders only active campaigns in the main site DOM', () => {
    document.body.innerHTML = `
      <h1 id="main-heading">Old</h1>
      <p id="hero-brand-subtitle">Old Sub</p>
      <a id="hero-primary-cta">Old CTA</a>
      <a id="hero-secondary-cta">Old CTA 2</a>
      <h2 id="work-heading">Old Work</h2>
      <p id="work-subtitle">Old Work Sub</p>
      <h2 id="services-heading">Old Services</h2>
      <p id="culture-quote-text">Old Quote</p>
      <cite id="culture-quote-author">Old Author</cite>
      <ul id="events-grid"></ul>
    `;

    applySiteContent(document, {
      brandTitle: 'MAIN CHARACTER MEDIA',
      workHeading: 'Updated Case Studies',
      cultureQuote: 'Fresh editorial note.',
    });
    expect(document.getElementById('work-heading')?.textContent).toBe('Updated Case Studies');
    expect(document.getElementById('culture-quote-text')?.textContent).toBe('Fresh editorial note.');

    const eventsGrid = document.getElementById('events-grid');
    renderCampaigns(eventsGrid, [
      {
        id: 'live-1',
        title: 'Autumn Creator Dinner',
        kind: 'Event',
        dateLabel: 'Nov 30',
        location: 'London',
        description: 'Intimate salon.',
        ctaLabel: 'Apply',
        ctaHref: '#brief',
        isActive: true,
      },
      {
        id: 'draft-1',
        title: 'Draft Activation',
        kind: 'Campaign',
        dateLabel: 'TBD',
        location: 'LA',
        description: 'Hidden.',
        ctaLabel: 'Apply',
        ctaHref: '#brief',
        isActive: false,
      },
    ]);

    expect(eventsGrid?.querySelectorAll('li')).toHaveLength(1);
    expect(eventsGrid?.textContent).toContain('Autumn Creator Dinner');
    expect(eventsGrid?.textContent).not.toContain('Draft Activation');
  });

  it('persists and renders custom sections (text, buttons, TikTok references), hero buttons, metrics, and hidden sections', async () => {
    const testSecret = `studio-pass-${Math.random().toString(36).slice(2)}`;
    process.env.MCM_ADMIN_PASSWORD = testSecret;

    const loginRes = createMockRes();
    await authHandler(
      createMockReq({ method: 'POST', body: { password: testSecret } }),
      loginRes.res,
    );
    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie[0].split(';')[0]
      : String(setCookie).split(';')[0];

    const putCms = createMockRes();
    await cmsHandler(
      createMockReq({
        method: 'PUT',
        headers: { cookie: cookieHeader },
        body: {
          heroButtons: [{ id: 'hb-1', label: 'Book Studio', href: '#brief', variant: 'primary' }],
          hiddenSections: ['ticker'],
          customSections: [
            {
              id: 'sec-tiktok',
              eyebrow: 'TikTok Feed',
              heading: 'Latest Creator Cuts',
              subtitle: 'Watch recent launches.',
              elements: [
                { id: 'el-txt', type: 'text', title: 'Format Note', body: 'Shot vertically in 4K.' },
                { id: 'el-btn', type: 'button', label: 'Pitch Us', href: '#brief', variant: 'secondary' },
                {
                  id: 'el-ref',
                  type: 'reference',
                  platform: 'tiktok',
                  title: 'Vespera Launch Cut',
                  handle: '@vespera',
                  url: 'https://www.tiktok.com/@vespera',
                  caption: '64M views in 6 weeks.',
                },
              ],
            },
          ],
        },
      }),
      putCms.res,
    );
    expect(putCms.statusCode).toBe(200);

    const publicCms = createMockRes();
    await cmsHandler(createMockReq({ method: 'GET', url: '/api/cms' }), publicCms.res);
    const payload = publicCms.json();
    expect(payload.heroButtons).toHaveLength(1);
    expect(payload.hiddenSections).toEqual(['ticker']);
    expect(payload.customSections[0].elements).toHaveLength(3);

    document.body.innerHTML = `
      <div id="hero-actions"><button type="button" id="install-app-btn" hidden>Install</button></div>
      <div class="ticker-band" data-section="ticker"></div>
      <div id="custom-sections-root"></div>
    `;

    renderHeroButtons(document.getElementById('hero-actions'), payload.heroButtons);
    expect(document.getElementById('hero-primary-cta')?.textContent).toBe('Book Studio');
    expect(document.getElementById('install-app-btn')).not.toBeNull();

    applyHiddenSections(document, payload.hiddenSections);
    expect(document.querySelector<HTMLElement>('[data-section="ticker"]')?.hidden).toBe(true);

    renderCustomSections(document.getElementById('custom-sections-root'), payload.customSections);
    const customRoot = document.getElementById('custom-sections-root')!;
    expect(customRoot.textContent).toContain('Latest Creator Cuts');
    expect(customRoot.textContent).toContain('Shot vertically in 4K.');
    expect(customRoot.textContent).toContain('Pitch Us');
    expect(customRoot.textContent).toContain('Vespera Launch Cut');
    expect(customRoot.querySelector('a[href="https://www.tiktok.com/@vespera"]')).not.toBeNull();
  });

  it('retains client messages for 30 days and prunes expired messages older than 30 days', () => {
    expect(SUBMISSION_RETENTION_DAYS).toBe(30);
    const now = Date.parse('2026-11-26T12:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;

    const freshSub = {
      id: 'sub-fresh',
      fullName: 'Ava Chen',
      email: 'ava@studio.example',
      brand: '@avastudio',
      budget: '25k-50k',
      channels: ['tiktok'],
      notes: 'Campaign brief sent 1 day ago across TikTok and creators.',
      status: 'new' as const,
      createdAt: new Date(now - 1 * dayMs).toISOString(),
    };
    const day29Sub = {
      ...freshSub,
      id: 'sub-day29',
      createdAt: new Date(now - 29 * dayMs).toISOString(),
    };
    const expiredSub = {
      ...freshSub,
      id: 'sub-expired',
      createdAt: new Date(now - 31 * dayMs).toISOString(),
    };

    expect(isSubmissionActive(freshSub, now)).toBe(true);
    expect(isSubmissionActive(day29Sub, now)).toBe(true);
    expect(isSubmissionActive(expiredSub, now)).toBe(false);

    const active = pruneAndSortSubmissions([expiredSub, day29Sub, freshSub], now);
    expect(active.map((s) => s.id)).toEqual(['sub-fresh', 'sub-day29']);
  });

  it('uploads magazine photos via POST /api/media, serves them on GET, and persists pagePhotos + pageTextBlocks', async () => {
    process.env.MCM_ADMIN_PASSWORD = 'media-test-passcode';
    const token = createSessionToken();
    const cookieHeader = `mcm_admin_session=${token}`;
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const unauthUpload = createMockRes();
    await mediaHandler(
      createMockReq({
        method: 'POST',
        body: { contentType: 'image/png', dataBase64: pngBase64 },
      }),
      unauthUpload.res,
    );
    expect(unauthUpload.statusCode).toBe(401);

    const uploadRes = createMockRes();
    await mediaHandler(
      createMockReq({
        method: 'POST',
        headers: { cookie: cookieHeader },
        body: { contentType: 'image/png', dataBase64: pngBase64 },
      }),
      uploadRes.res,
    );
    expect(uploadRes.statusCode).toBe(201);
    const uploadedUrl = uploadRes.json().url as string;
    expect(uploadedUrl).toMatch(/^\/api\/media\?id=/);
    const uploadedId = new URL(uploadedUrl, 'http://localhost').searchParams.get('id')!;

    try {
      const getMedia = createMockRes();
      await mediaHandler(createMockReq({ method: 'GET', url: uploadedUrl }), getMedia.res);
      expect(getMedia.statusCode).toBe(200);
      expect(getMedia.headers['content-type']).toBe('image/png');

      const putCms = createMockRes();
      await cmsHandler(
        createMockReq({
          method: 'PUT',
          headers: { cookie: cookieHeader },
          body: {
            pagePhotos: {
              cover: [{ id: 'ph-up', src: uploadedUrl, caption: 'Uploaded Cover' }],
            },
            pageTextBlocks: {
              work: [{ id: 'tb-1', style: 'article', title: 'Addendum', body: 'Extra column copy.' }],
            },
          },
        }),
        putCms.res,
      );
      expect(putCms.statusCode).toBe(200);

      const getCms = createMockRes();
      await cmsHandler(createMockReq({ method: 'GET', url: '/api/cms' }), getCms.res);
      expect(getCms.json().pagePhotos.cover[0].src).toBe(uploadedUrl);
      expect(getCms.json().pageTextBlocks.work[0].body).toBe('Extra column copy.');
    } finally {
      const uploadedPath = path.join(process.cwd(), '.data', 'media', uploadedId);
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    }
  });
});
