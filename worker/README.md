# POF 2828 — Cloud Sync Worker

Cloudflare Worker + D1 that mirrors the five synced tables (`clips`,
`notes`, `bookmarks`, `prompts`, `tasks`) across every enrolled device.
There is no UI for enrollment; devices are provisioned by hand with
`wrangler d1 execute`.

## Endpoints

All requests require `Authorization: Bearer <raw_token>`. The server
stores `sha256(raw_token)` and looks the device up by that hash.

| Method | Path              | Purpose                                   |
| ------ | ----------------- | ----------------------------------------- |
| POST   | `/auth/ping`      | Returns `{device_id, label, server_time}` |
| GET    | `/sync/:table`    | Pull rows with `rev > since` (pagination) |
| POST   | `/sync/:table`    | Push `{changes:[...]}`, returns applied + conflicts |

Valid tables: `clips`, `notes`, `bookmarks`, `prompts`, `tasks`.

### Conflict policy

* **Notes** — 3-way merge by `base_rev` using diff-match-patch. Hard
  conflicts keep the server row and materialize the loser as a sibling
  row `id = "<orig>-conflict-<device_id>-<updated_at>"`. Nothing is
  dropped.
* **Everything else** — last-write-wins by `updated_at` (ms epoch,
  client wall time). Older incoming edits are reported as conflicts and
  rejected; the client's next pull will pick up the winner.

Tombstones (`deleted=1`) replicate like any other row and are purged by
the daily cron once they're older than 30 days.

## One-time setup

```bash
cd worker
npm install

# Create the D1 database, then paste the printed id into wrangler.toml.
wrangler d1 create pof

# Apply the schema locally (for `wrangler dev`) and to the deployed DB.
npm run migrate:local
npm run migrate:remote

# Ship it.
npm run deploy
```

## Provisioning a device (no UI)

Do this once per device (5× for a 5-device setup):

```bash
# 1. Generate a raw token and hash it.
TOKEN=$(openssl rand -hex 32)
HASH=$(printf %s "$TOKEN" | sha256sum | awk '{print $1}')

# 2. Insert the device. created_at is ms epoch.
wrangler d1 execute pof --remote --command \
  "INSERT INTO devices (device_id, token_hash, label, created_at)
   VALUES ('laptop-1', '$HASH', 'Main laptop', CAST(strftime('%s','now') AS INTEGER)*1000);"

# 3. On the device, open the PWA and run in the browser console:
#    localStorage.setItem('pof_cloud_url',   'https://pof-sync.<subdomain>.workers.dev');
#    localStorage.setItem('pof_auth_token',  '<paste $TOKEN here>');
echo "Token for laptop-1: $TOKEN"
```

`$TOKEN` is shown once; the server only keeps the hash. If you lose it,
revoke the row (`UPDATE devices SET revoked=1 WHERE device_id=...`) and
issue a new one.

## Cron: tombstone purge

`wrangler.toml` schedules a daily cron at `17 4 * * *` (04:17 UTC) that
deletes every row where `deleted=1 AND updated_at < now - 30 days`.
After that window, the tombstone has had a full month to replicate —
any device that hasn't synced in 30 days will need to re-enroll.

To trigger the cron manually in dev:

```bash
curl "http://localhost:8787/__scheduled?cron=17+4+*+*+*"
```

## Local dev

```bash
npm run dev              # wrangler dev, uses --local D1
npm run typecheck        # strict tsc, no emit
```

The client (`src/lib/api.ts` + `src/lib/sync.ts`) reads
`pof_cloud_url` and `pof_auth_token` from `localStorage`. If either is
missing the sync loop silently no-ops, so unenrolled devices work
offline-only without errors.
