import type { Device } from './auth';
import { threeWayMerge } from './merge';

export type TableName = 'clips' | 'notes' | 'bookmarks' | 'prompts' | 'tasks';
export const TABLES: TableName[] = ['clips', 'notes', 'bookmarks', 'prompts', 'tasks'];

// Notes use 3-way merge; everything else is last-write-wins.
const NOTES_TABLE: TableName = 'notes';

export interface ClipChange {
  id: string;
  body: string;
  updated_at: number;
  deleted?: 0 | 1;
}

export interface NoteChange extends ClipChange {
  title?: string | null;
  base_rev?: number | null;
}

type AnyChange = ClipChange | NoteChange;

interface AppliedRow {
  id: string;
  rev: number;
  updated_at: number;
}

interface ConflictRow {
  id: string;
  rev: number;
  reason: 'updated_at_older' | 'merge_conflict';
  server: ServerRow;
}

interface ServerRow {
  id: string;
  device_id: string;
  body: string;
  updated_at: number;
  rev: number;
  deleted: number;
  title?: string | null;
  base_rev?: number | null;
}

const j = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const bad = (msg: string, status = 400) => j({ error: msg }, status);

// GET /sync/:table?since=<rev>&limit=500
export async function handlePull(table: TableName, url: URL, db: D1Database): Promise<Response> {
  const since = Number(url.searchParams.get('since') || '0') | 0;
  const limit = Math.min(Number(url.searchParams.get('limit') || '500') | 0, 1000);

  const cols = table === NOTES_TABLE
    ? 'id, device_id, title, body, base_rev, updated_at, rev, deleted'
    : 'id, device_id, body, updated_at, rev, deleted';

  const { results } = await db
    .prepare(`SELECT ${cols} FROM ${table} WHERE rev > ? ORDER BY rev ASC LIMIT ?`)
    .bind(since, limit)
    .all<ServerRow>();

  const cursor = await db
    .prepare(`SELECT COALESCE(MAX(rev), 0) AS r FROM ${table}`)
    .first<{ r: number }>();

  return j({
    table,
    rows: results ?? [],
    new_cursor: cursor?.r ?? since,
  });
}

// POST /sync/:table  body = { changes: [...] }
export async function handlePush(
  table: TableName,
  req: Request,
  db: D1Database,
  device: Device,
): Promise<Response> {
  let body: { changes?: AnyChange[] };
  try { body = await req.json(); } catch { return bad('invalid json'); }
  const changes = Array.isArray(body.changes) ? body.changes : [];

  const applied: AppliedRow[] = [];
  const conflicts: ConflictRow[] = [];
  let highestRev = 0;

  for (const change of changes) {
    if (!change || typeof change.id !== 'string' || typeof change.updated_at !== 'number') {
      return bad('change requires {id, updated_at, ...}');
    }
    const result = table === NOTES_TABLE
      ? await applyNote(db, device, change as NoteChange)
      : await applyLww(table, db, device, change as ClipChange);

    if ('applied' in result) {
      applied.push(result.applied);
      if (result.applied.rev > highestRev) highestRev = result.applied.rev;
    } else {
      conflicts.push(result.conflict);
    }
  }

  const cursor = await db
    .prepare(`SELECT COALESCE(MAX(rev), 0) AS r FROM ${table}`)
    .first<{ r: number }>();

  return j({
    table,
    applied,
    conflicts,
    new_cursor: cursor?.r ?? highestRev,
  });
}

async function nextRev(db: D1Database, table: TableName): Promise<number> {
  const row = await db
    .prepare(`SELECT COALESCE(MAX(rev), 0) AS r FROM ${table}`)
    .first<{ r: number }>();
  return (row?.r ?? 0) + 1;
}

async function applyLww(
  table: TableName,
  db: D1Database,
  device: Device,
  change: ClipChange,
): Promise<{ applied: AppliedRow } | { conflict: ConflictRow }> {
  const existing = await db
    .prepare(`SELECT id, device_id, body, updated_at, rev, deleted FROM ${table} WHERE id = ?`)
    .bind(change.id)
    .first<ServerRow>();

  if (existing && existing.updated_at > change.updated_at) {
    return {
      conflict: {
        id: change.id,
        rev: existing.rev,
        reason: 'updated_at_older',
        server: existing,
      },
    };
  }

  const rev = await nextRev(db, table);
  const deleted = change.deleted ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO ${table} (id, device_id, body, updated_at, rev, deleted)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         device_id = excluded.device_id,
         body = excluded.body,
         updated_at = excluded.updated_at,
         rev = excluded.rev,
         deleted = excluded.deleted`,
    )
    .bind(change.id, device.device_id, change.body, change.updated_at, rev, deleted)
    .run();

  return { applied: { id: change.id, rev, updated_at: change.updated_at } };
}

async function applyNote(
  db: D1Database,
  device: Device,
  change: NoteChange,
): Promise<{ applied: AppliedRow } | { conflict: ConflictRow }> {
  const existing = await db
    .prepare('SELECT id, device_id, title, body, base_rev, updated_at, rev, deleted FROM notes WHERE id = ?')
    .bind(change.id)
    .first<ServerRow>();

  // New note or matching base_rev → fast path.
  if (!existing || (change.base_rev != null && change.base_rev === existing.rev)) {
    return upsertNote(db, device, change);
  }

  // Tombstones bypass merge — last-write-wins by updated_at.
  if (change.deleted || existing.deleted) {
    if (existing.updated_at > change.updated_at) {
      return { conflict: { id: change.id, rev: existing.rev, reason: 'updated_at_older', server: existing } };
    }
    return upsertNote(db, device, change);
  }

  // Concurrent edit — try 3-way merge against the row the client last saw.
  const baseRow = change.base_rev != null
    ? await db
        .prepare('SELECT body FROM notes WHERE id = ? AND rev = ?')
        .bind(change.id, change.base_rev)
        .first<{ body: string }>()
    : null;
  const baseBody = baseRow?.body ?? existing.body;

  const merge = threeWayMerge(baseBody, existing.body, change.body);
  if (!merge.conflict) {
    return upsertNote(db, device, { ...change, body: merge.body });
  }

  // Hard conflict: server keeps current; we record the loser as a sibling row.
  const loserId = `${change.id}-conflict-${device.device_id}-${change.updated_at}`;
  await upsertNote(db, device, { ...change, id: loserId });
  return { conflict: { id: change.id, rev: existing.rev, reason: 'merge_conflict', server: existing } };
}

async function upsertNote(
  db: D1Database,
  device: Device,
  change: NoteChange,
): Promise<{ applied: AppliedRow }> {
  const rev = await nextRev(db, 'notes');
  const deleted = change.deleted ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO notes (id, device_id, title, body, base_rev, updated_at, rev, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         device_id = excluded.device_id,
         title = excluded.title,
         body = excluded.body,
         base_rev = excluded.base_rev,
         updated_at = excluded.updated_at,
         rev = excluded.rev,
         deleted = excluded.deleted`,
    )
    .bind(
      change.id,
      device.device_id,
      change.title ?? null,
      change.body,
      change.base_rev ?? rev,
      change.updated_at,
      rev,
      deleted,
    )
    .run();

  return { applied: { id: change.id, rev, updated_at: change.updated_at } };
}

// Cron: purge tombstones older than 30 days.
export async function purgeOldTombstones(db: D1Database): Promise<{ deleted: number }> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let total = 0;
  for (const t of TABLES) {
    const res = await db
      .prepare(`DELETE FROM ${t} WHERE deleted = 1 AND updated_at < ?`)
      .bind(cutoff)
      .run();
    total += res.meta?.changes ?? 0;
  }
  return { deleted: total };
}
