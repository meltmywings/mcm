import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CmsState } from '../../src/types/cms';
import { DEFAULT_CMS_STATE } from './defaultState';

const STATE_KEY = 'mcm:cms:v1';

function getKvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

function getLocalFilePath(): string {
  const dir = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), '.data');
  return path.join(dir, 'mcm-cms-state.json');
}

function mergeWithDefaults(partial: Partial<CmsState>): CmsState {
  return {
    siteContent: {
      ...DEFAULT_CMS_STATE.siteContent,
      ...(partial.siteContent ?? {}),
    },
    caseStudies: Array.isArray(partial.caseStudies)
      ? partial.caseStudies
      : structuredClone(DEFAULT_CMS_STATE.caseStudies),
    campaigns: Array.isArray(partial.campaigns)
      ? partial.campaigns
      : structuredClone(DEFAULT_CMS_STATE.campaigns),
    clients: Array.isArray(partial.clients)
      ? partial.clients
      : structuredClone(DEFAULT_CMS_STATE.clients),
    submissions: Array.isArray(partial.submissions)
      ? partial.submissions
      : structuredClone(DEFAULT_CMS_STATE.submissions),
  };
}

export async function loadCmsState(): Promise<CmsState> {
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
    return structuredClone(DEFAULT_CMS_STATE);
  }
}

export async function saveCmsState(next: CmsState): Promise<CmsState> {
  const normalized = mergeWithDefaults(next);
  const serialized = JSON.stringify(normalized);

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

