import { authenticate } from './auth';
import { TABLES, TableName, handlePull, handlePush, purgeOldTombstones } from './sync';

interface Env {
  DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function isTable(s: string): s is TableName {
  return (TABLES as string[]).includes(s);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    const path = url.pathname;

    const device = await authenticate(req, env.DB);
    if (!device) return json({ error: 'unauthorized' }, 401);

    if (path === '/auth/ping') {
      return json({ device_id: device.device_id, label: device.label, server_time: Date.now() });
    }

    const m = /^\/sync\/([a-z]+)\/?$/.exec(path);
    if (m) {
      const table = m[1];
      if (!isTable(table)) return json({ error: 'unknown table' }, 404);

      if (req.method === 'GET')  return withCors(await handlePull(table, url, env.DB));
      if (req.method === 'POST') return withCors(await handlePush(table, req, env.DB, device));
      return json({ error: 'method not allowed' }, 405);
    }

    return json({ error: 'not found' }, 404);
  },

  // Cloudflare cron trigger — purge tombstones older than 30 days.
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await purgeOldTombstones(env.DB);
  },
};
