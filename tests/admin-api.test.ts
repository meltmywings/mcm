import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken, verifyPasscode, verifySessionToken } from '../api/_lib/auth';
import authHandler from '../api/auth';
import clientsHandler from '../api/clients';
import cmsHandler from '../api/cms';
import submissionsHandler from '../api/submissions';
import { applySiteContent, renderCampaigns } from '../src/scripts/cmsView';

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
  const tmpStore = '/tmp/mcm-cms-state.json';

  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
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
});
