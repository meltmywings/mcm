import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import type { CmsState, SubmissionRecord, SubmissionStatus } from '../../src/types/cms';
import { DEFAULT_CMS_STATE } from './defaultState';

export const SUBMISSION_RETENTION_DAYS = 30;
export const SUBMISSION_RETENTION_MS = SUBMISSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const STATE_KEY = 'mcm:cms:v1';
const CMS_BLOB_PATH = 'cms/state.json';
const SUBMISSIONS_PREFIX = 'submissions/';
const SUBMISSIONS_SEEDED_PATH = 'submissions/.seeded';

function getKvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

export function hasBlobStore(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

function getLocalFilePath(): string {
  const dir = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), '.data');
  return path.join(dir, 'mcm-cms-state.json');
}

export function isSubmissionActive(sub: SubmissionRecord, now = Date.now()): boolean {
  const createdMs = Date.parse(sub.createdAt);
  if (Number.isNaN(createdMs)) return true;
  return now - createdMs <= SUBMISSION_RETENTION_MS;
}

export function pruneAndSortSubmissions(
  submissions: readonly SubmissionRecord[],
  now = Date.now(),
): SubmissionRecord[] {
  return submissions
    .filter((sub) => isSubmissionActive(sub, now))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function mergeWithDefaults(partial: Partial<CmsState>): CmsState {
  return {
    siteContent: {
      ...DEFAULT_CMS_STATE.siteContent,
      ...(partial.siteContent ?? {}),
    },
    heroButtons: Array.isArray(partial.heroButtons)
      ? partial.heroButtons
      : structuredClone(DEFAULT_CMS_STATE.heroButtons),
    metrics: Array.isArray(partial.metrics)
      ? partial.metrics
      : structuredClone(DEFAULT_CMS_STATE.metrics),
    tickerItems: Array.isArray(partial.tickerItems)
      ? partial.tickerItems
      : structuredClone(DEFAULT_CMS_STATE.tickerItems),
    caseStudies: Array.isArray(partial.caseStudies)
      ? partial.caseStudies
      : structuredClone(DEFAULT_CMS_STATE.caseStudies),
    campaigns: Array.isArray(partial.campaigns)
      ? partial.campaigns
      : structuredClone(DEFAULT_CMS_STATE.campaigns),
    services: Array.isArray(partial.services)
      ? partial.services
      : structuredClone(DEFAULT_CMS_STATE.services),
    processSteps: Array.isArray(partial.processSteps)
      ? partial.processSteps
      : structuredClone(DEFAULT_CMS_STATE.processSteps),
    faqs: Array.isArray(partial.faqs)
      ? partial.faqs
      : structuredClone(DEFAULT_CMS_STATE.faqs),
    customSections: Array.isArray(partial.customSections)
      ? partial.customSections
      : structuredClone(DEFAULT_CMS_STATE.customSections),
    hiddenSections: Array.isArray(partial.hiddenSections)
      ? partial.hiddenSections
      : structuredClone(DEFAULT_CMS_STATE.hiddenSections),
    pagePhotos:
      partial.pagePhotos && typeof partial.pagePhotos === 'object'
        ? { ...structuredClone(DEFAULT_CMS_STATE.pagePhotos), ...partial.pagePhotos }
        : structuredClone(DEFAULT_CMS_STATE.pagePhotos),
    pageTextBlocks:
      partial.pageTextBlocks && typeof partial.pageTextBlocks === 'object'
        ? partial.pageTextBlocks
        : structuredClone(DEFAULT_CMS_STATE.pageTextBlocks),
    clients: Array.isArray(partial.clients)
      ? partial.clients
      : structuredClone(DEFAULT_CMS_STATE.clients),
    submissions: Array.isArray(partial.submissions)
      ? pruneAndSortSubmissions(partial.submissions)
      : pruneAndSortSubmissions(structuredClone(DEFAULT_CMS_STATE.submissions)),
  };
}

async function readPrivateBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

async function writePrivateBlobJson(
  pathname: string,
  data: unknown,
  ttlDays?: number,
): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(ttlDays ? { ttlDays } : {}),
  });
}

function remainingTtlDays(createdAt: string, now = Date.now()): number {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return SUBMISSION_RETENTION_DAYS;
  const msLeft = createdMs + SUBMISSION_RETENTION_MS - now;
  return Math.max(1, Math.min(SUBMISSION_RETENTION_DAYS, Math.ceil(msLeft / (24 * 60 * 60 * 1000))));
}

async function listAllSubmissionBlobs() {
  const blobs: Array<{ pathname: string }> = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: SUBMISSIONS_PREFIX, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function ensureSeededInBlob(): Promise<void> {
  const blobs = await listAllSubmissionBlobs();
  const hasSeedMarker = blobs.some((b) => b.pathname === SUBMISSIONS_SEEDED_PATH);
  const jsonBlobs = blobs.filter((b) => b.pathname.endsWith('.json'));
  if (!hasSeedMarker && jsonBlobs.length === 0) {
    for (const sub of DEFAULT_CMS_STATE.submissions) {
      if (isSubmissionActive(sub)) {
        await writePrivateBlobJson(
          `${SUBMISSIONS_PREFIX}${sub.id}.json`,
          sub,
          SUBMISSION_RETENTION_DAYS,
        );
      }
    }
    await writePrivateBlobJson(SUBMISSIONS_SEEDED_PATH, { seededAt: new Date().toISOString() });
  } else if (!hasSeedMarker) {
    await writePrivateBlobJson(SUBMISSIONS_SEEDED_PATH, { seededAt: new Date().toISOString() });
  }
}

export async function loadCmsState(): Promise<CmsState> {
  if (hasBlobStore()) {
    try {
      const parsed = await readPrivateBlobJson<Partial<CmsState>>(CMS_BLOB_PATH);
      return mergeWithDefaults(parsed ?? {});
    } catch {
      // Fall through to KV/local fallback if blob read fails
    }
  }

  const kv = getKvConfig();
  if (kv) {
    try {
      const res = await fetch(`${kv.url}/get/${encodeURIComponent(STATE_KEY)}`, {
        headers: { Authorization: `Bearer ${kv.token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (data.result) {
          return mergeWithDefaults(JSON.parse(data.result) as Partial<CmsState>);
        }
      }
    } catch {
      // Fall back to local/default state if KV request fails
    }
  }

  try {
    const raw = await fs.readFile(getLocalFilePath(), 'utf8');
    return mergeWithDefaults(JSON.parse(raw) as Partial<CmsState>);
  } catch {
    return mergeWithDefaults(structuredClone(DEFAULT_CMS_STATE));
  }
}

export async function saveCmsState(next: CmsState): Promise<CmsState> {
  const normalized = mergeWithDefaults(next);
  const serialized = JSON.stringify(normalized);

  if (hasBlobStore()) {
    await writePrivateBlobJson(CMS_BLOB_PATH, normalized);
    return normalized;
  }

  const kv = getKvConfig();
  if (kv) {
    await fetch(`${kv.url}/set/${encodeURIComponent(STATE_KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serialized),
    });
  }

  const filePath = getLocalFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, serialized, 'utf8');
  return normalized;
}

export async function loadSubmissions(): Promise<SubmissionRecord[]> {
  if (hasBlobStore()) {
    await ensureSeededInBlob();
    const blobs = await listAllSubmissionBlobs();
    const jsonBlobs = blobs.filter((b) => b.pathname.endsWith('.json'));
    const loaded = await Promise.all(
      jsonBlobs.map(async (b) => ({
        pathname: b.pathname,
        record: await readPrivateBlobJson<SubmissionRecord>(b.pathname).catch(() => null),
      })),
    );

    const now = Date.now();
    const active: SubmissionRecord[] = [];
    const expiredPaths: string[] = [];

    for (const item of loaded) {
      if (!item.record) continue;
      if (isSubmissionActive(item.record, now)) {
        active.push(item.record);
      } else {
        expiredPaths.push(item.pathname);
      }
    }

    if (expiredPaths.length > 0) {
      await del(expiredPaths).catch(() => undefined);
    }

    return pruneAndSortSubmissions(active, now);
  }

  const state = await loadCmsState();
  return pruneAndSortSubmissions(state.submissions);
}

export async function createSubmission(submission: SubmissionRecord): Promise<SubmissionRecord> {
  if (hasBlobStore()) {
    await writePrivateBlobJson(SUBMISSIONS_SEEDED_PATH, { seededAt: new Date().toISOString() }).catch(
      () => undefined,
    );
    await writePrivateBlobJson(
      `${SUBMISSIONS_PREFIX}${submission.id}.json`,
      submission,
      SUBMISSION_RETENTION_DAYS,
    );
    return submission;
  }

  const state = await loadCmsState();
  await saveCmsState({
    ...state,
    submissions: pruneAndSortSubmissions([submission, ...state.submissions]),
  });
  return submission;
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<SubmissionRecord[]> {
  if (hasBlobStore()) {
    const pathname = `${SUBMISSIONS_PREFIX}${id}.json`;
    const existing = await readPrivateBlobJson<SubmissionRecord>(pathname);
    if (existing && isSubmissionActive(existing)) {
      const updated: SubmissionRecord = { ...existing, status };
      await writePrivateBlobJson(
        pathname,
        updated,
        remainingTtlDays(existing.createdAt),
      );
    }
    return loadSubmissions();
  }

  const state = await loadCmsState();
  const next = await saveCmsState({
    ...state,
    submissions: pruneAndSortSubmissions(
      state.submissions.map((item) => (item.id === id ? { ...item, status } : item)),
    ),
  });
  return next.submissions;
}

export async function deleteSubmission(id: string): Promise<SubmissionRecord[]> {
  if (hasBlobStore()) {
    await del(`${SUBMISSIONS_PREFIX}${id}.json`).catch(() => undefined);
    return loadSubmissions();
  }

  const state = await loadCmsState();
  const next = await saveCmsState({
    ...state,
    submissions: pruneAndSortSubmissions(state.submissions.filter((item) => item.id !== id)),
  });
  return next.submissions;
}
