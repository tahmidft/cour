---
name: supabase
description: >-
  Configure Supabase for Cour (auth URLs, migrations, env). Use when the user
  mentions Supabase, magic links, redirect URLs, site URL, auth configuration,
  or running SQL migrations against the Cour project.
disable-model-invocation: false
---

# Supabase (Cour)

Project ref: `kmaydeqxhlpuolmcolso` (from `VITE_SUPABASE_URL`).

## Auth URL configuration (production + local)

Magic links require **Site URL** and **Redirect URLs** to match `VITE_APP_URL` and local dev.

### Preferred: Management API script

1. Create a personal access token: https://supabase.com/dashboard/account/tokens  
   Scopes: `auth_config_write`, `project_admin_write` (or full access).

2. Add to `.env` (never commit):
   ```env
   SUPABASE_ACCESS_TOKEN=sbp_...
   ```

3. Run from repo root:
   ```bash
   npm run supabase:auth-urls
   ```
   Or with an explicit production URL:
   ```bash
   node .cursor/skills/supabase/scripts/configure-auth-urls.mjs --site-url https://cour-anime.vercel.app
   ```

The script sets:
- `site_url` → production app URL (no trailing slash)
- `uri_allow_list` → production `/**`, `http://localhost:5173/**`, `http://localhost:3000/**`, and any existing non-localhost entries

Reads `VITE_SUPABASE_URL` and `SUPABASE_ACCESS_TOKEN` from `.env`.

### Manual (dashboard)

Authentication → URL Configuration:
- **Site URL:** `https://cour-anime.vercel.app`
- **Redirect URLs:** `https://cour-anime.vercel.app/**`, `http://localhost:5173/**`, `http://localhost:3000/**`

## Migrations

SQL lives in `supabase/schema.sql` and `supabase/migrations/`. Run new migrations in Supabase SQL Editor or via CLI when linked.

## Env vars (Cour)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Client + project ref |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser client |
| `SUPABASE_SECRET_KEY` | Server/cron only |
| `SUPABASE_ACCESS_TOKEN` | Management API (local only) |

## After Vercel URL changes

When production hostname changes (e.g. `cour-jet` → `cour-anime`):

1. Update `VITE_APP_URL` on Vercel
2. Run `npm run supabase:auth-urls` with the new `--site-url`
3. Redeploy Vercel so email/unsubscribe links use the new URL

## Free-tier pause prevention

Supabase pauses free projects after ~7 days without DB/API activity.

**Already in place:** daily Vercel cron (`/api/cron/check-shows`) queries Supabase.

**Backup:** `/api/keep-alive` — lightweight `profiles` read. Ping every 2–3 days from [UptimeRobot](https://uptimerobot.com) (free):

1. Monitor type: **HTTP(s)**
2. URL: `https://cour-anime.vercel.app/api/keep-alive?key=YOUR_CRON_SECRET`
3. Interval: **every 3 days** (or daily)
4. Alert: email you if not `200` or body contains `"ok":true`

Local test:
```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/keep-alive"
# production (use key query param for UptimeRobot-style pings):
curl -sS "https://cour-anime.vercel.app/api/keep-alive?key=$CRON_SECRET"
```
