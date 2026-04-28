// ─── POF 2828 — D1 sync orchestrator ───
//
// Pulls then pushes per table against the Cloudflare Worker. Source of
// truth on the client is localStorage under `pof2828_<table>` (the same
// keys useDashboardStore reads/writes). The cloud is a strict mirror.
//
// Cursor tracking (per table, in localStorage):
//   pof_last_rev_<table>    server's `rev` we've already pulled
//   pof_synced_at_<table>   highest local updatedAt we've already pushed
//
// Conflict policy mirrors the worker:
//   * notes      → 3-way merge by base_rev
//   * everything → last-write-wins by updated_at
//
// The orchestrator is debounced and offline-tolerant. If cloud isn't
// configured (no token / no URL) it silently no-ops so first-run devices
// don't see errors before enrollment.

import { cloudConfigured, cloudFetch } from './api';

type TableName = 'clips' | 'notes' | 'bookmarks' | 'prompts' | 'tasks';
const TABLES: TableName[] = ['clips', 'notes', 'bookmarks', 'prompts', 'tasks'];

const STORAGE_KEY: Record<TableName, string> = {
  clips: 'pof2828_clips',
  notes: 'pof2828_notes',
  bookmarks: 'pof2828_bookmarks',
  prompts: 'pof2828_prompts',
  tasks: 'pof2828_tasks',
};

const REV_KEY = (t: TableName) => `pof_last_rev_${t}`;
const SYNCED_KEY = (t: TableName) => `pof_synced_at_${t}`;
const BASE_REV_KEY = (id: string) => `pof_note_base_rev_${id}`;

interface LocalItem {
  id: string;
  updatedAt?: string;
  createdAt?: string;
  deleted?: boolean;
  // notes
  title?: string;
  content?: string;
  // ...rest is opaque to the orchestrator
  [k: string]: unknown;
}

interface CloudClipRow {
  id: string;
  device_id: string;
  body: string;
  updated_at: number;
  rev: number;
  deleted: 0 | 1;
}

interface CloudNoteRow extends CloudClipRow {
  title: string | null;
  base_rev: number | null;
}

interface PullResponse<T> {
  table: TableName;
  rows: T[];
  new_cursor: number;
}

interface PushResponse {
  table: TableName;
  applied: { id: string; rev: number; updated_at: number }[];
  conflicts: { id: string; rev: number; reason: string; server: CloudNoteRow }[];
  new_cursor: number;
}

interface ChangePayload {
  id: string;
  body: string;
  updated_at: number;
  deleted?: 0 | 1;
  // notes-only
  title?: string | null;
  base_rev?: number | null;
}

// ─── localStorage helpers ───

function readTable(table: TableName): LocalItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY[table]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTable(table: TableName, items: LocalItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY[table], JSON.stringify(items));
  } catch {
    // quota exceeded — caller will retry next tick
  }
}

function getCursor(table: TableName): number {
  return Number(localStorage.getItem(REV_KEY(table)) || '0') | 0;
}

function setCursor(table: TableName, rev: number): void {
  localStorage.setItem(REV_KEY(table), String(rev));
}

function getSyncedAt(table: TableName): number {
  return Number(localStorage.getItem(SYNCED_KEY(table)) || '0') | 0;
}

function setSyncedAt(table: TableName, ts: number): void {
  localStorage.setItem(SYNCED_KEY(table), String(ts));
}

function timestampOf(item: LocalItem): number {
  const raw = item.updatedAt || item.createdAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

// ─── Pull: server → local ───

async function pullTable(table: TableName): Promise<void> {
  const since = getCursor(table);
  const url = `/sync/${table}?since=${since}&limit=500`;
  const res = await cloudFetch<PullResponse<CloudClipRow | CloudNoteRow>>(url, { method: 'GET' });
  if (!res) return;

  const local = readTable(table);
  const byId = new Map(local.map((r) => [r.id, r]));

  for (const row of res.rows) {
    if (row.deleted) {
      byId.delete(row.id);
      if (table === 'notes') localStorage.removeItem(BASE_REV_KEY(row.id));
      continue;
    }
    const merged = unpackCloudRow(table, row);
    const existing = byId.get(row.id);
    // LWW guard: don't overwrite a strictly newer local edit. The next
    // push will resolve it server-side by updated_at.
    if (existing && timestampOf(existing) > row.updated_at) continue;
    byId.set(row.id, merged);
    if (table === 'notes') {
      localStorage.setItem(BASE_REV_KEY(row.id), String(row.rev));
    }
  }

  writeTable(table, [...byId.values()]);
  setCursor(table, res.new_cursor);
}

function unpackCloudRow(table: TableName, row: CloudClipRow | CloudNoteRow): LocalItem {
  if (table === 'notes') {
    const note = row as CloudNoteRow;
    return {
      id: note.id,
      title: note.title ?? '',
      content: note.body,
      updatedAt: new Date(note.updated_at).toISOString(),
    };
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(row.body) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return {
    ...parsed,
    id: row.id,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// ─── Push: local → server ───

async function pushTable(table: TableName): Promise<void> {
  const local = readTable(table);
  const watermark = getSyncedAt(table);

  const changes: ChangePayload[] = [];
  let highestTs = watermark;

  for (const item of local) {
    const ts = timestampOf(item);
    if (ts <= watermark) continue;
    changes.push(packLocalRow(table, item, ts));
    if (ts > highestTs) highestTs = ts;
  }

  if (changes.length === 0) return;

  const res = await cloudFetch<PushResponse>(`/sync/${table}`, {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
  if (!res) return;

  // Advance the push watermark only for rows the server actually accepted.
  // Conflicts come back with the server's row attached, which the next
  // pullTable() round will materialize locally.
  const appliedIds = new Set(res.applied.map((a) => a.id));
  const acceptedTs = changes
    .filter((c) => appliedIds.has(c.id))
    .map((c) => c.updated_at);
  if (acceptedTs.length) {
    setSyncedAt(table, Math.max(watermark, ...acceptedTs));
  }

  if (table === 'notes') {
    for (const a of res.applied) {
      localStorage.setItem(BASE_REV_KEY(a.id), String(a.rev));
    }
  }

  if (res.new_cursor > getCursor(table)) {
    setCursor(table, res.new_cursor);
  }
}

function packLocalRow(table: TableName, item: LocalItem, ts: number): ChangePayload {
  if (table === 'notes') {
    const baseRevRaw = localStorage.getItem(BASE_REV_KEY(item.id));
    const baseRev = baseRevRaw == null ? null : Number(baseRevRaw);
    return {
      id: item.id,
      title: (item.title as string) ?? null,
      body: (item.content as string) ?? '',
      base_rev: Number.isFinite(baseRev as number) ? (baseRev as number) : null,
      updated_at: ts,
      deleted: item.deleted ? 1 : 0,
    };
  }
  // Strip id and timestamps from the body envelope — they live in their
  // own columns server-side, no point storing them twice.
  const { id: _id, updatedAt: _u, createdAt: _c, ...rest } = item;
  void _id; void _u; void _c;
  return {
    id: item.id,
    body: JSON.stringify(rest),
    updated_at: ts,
    deleted: item.deleted ? 1 : 0,
  };
}

// ─── Orchestrator ───

let inflight: Promise<void> | null = null;
let pendingDebounce: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 400;

async function syncAll(): Promise<void> {
  for (const table of TABLES) {
    try {
      await pullTable(table);
      await pushTable(table);
    } catch (err) {
      // Network blip / 401 / 5xx — leave cursor intact and try next tick.
      console.warn(`[sync] ${table} failed:`, err);
    }
  }
}

export function syncNow(): Promise<void> {
  if (!cloudConfigured()) return Promise.resolve();
  if (inflight) return inflight;
  inflight = syncAll().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function scheduleSync(): void {
  if (!cloudConfigured()) return;
  if (pendingDebounce) clearTimeout(pendingDebounce);
  pendingDebounce = setTimeout(() => {
    pendingDebounce = null;
    void syncNow();
  }, DEBOUNCE_MS);
}

const INTERVAL_MS = 30_000;

// Wires up the lifecycle triggers exactly once. Returns a teardown so
// React StrictMode's double-mount in dev doesn't leak listeners.
export function startSyncLoop(): () => void {
  let interval: ReturnType<typeof setInterval> | null = null;

  const start = () => {
    if (interval != null) return;
    void syncNow();
    interval = setInterval(() => void syncNow(), INTERVAL_MS);
  };
  const stop = () => {
    if (interval == null) return;
    clearInterval(interval);
    interval = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') start();
    else stop();
  };
  const onFocus = () => scheduleSync();
  const onOnline = () => scheduleSync();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);

  if (document.visibilityState === 'visible') start();

  return () => {
    stop();
    if (pendingDebounce) {
      clearTimeout(pendingDebounce);
      pendingDebounce = null;
    }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onOnline);
  };
}
