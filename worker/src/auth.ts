// Token auth: client sends `Authorization: Bearer <raw_token>`.
// Server stores sha256(raw_token) hex-encoded and looks the device up by it.

export interface Device {
  device_id: string;
  label: string | null;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function authenticate(req: Request, db: D1Database): Promise<Device | null> {
  const header = req.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const tokenHash = await sha256Hex(m[1]);

  const row = await db
    .prepare('SELECT device_id, label, revoked FROM devices WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ device_id: string; label: string | null; revoked: number }>();

  if (!row || row.revoked) return null;

  // Best-effort last_seen update; don't block the request on it.
  db.prepare('UPDATE devices SET last_seen = ? WHERE device_id = ?')
    .bind(Date.now(), row.device_id)
    .run()
    .catch(() => {});

  return { device_id: row.device_id, label: row.label };
}
