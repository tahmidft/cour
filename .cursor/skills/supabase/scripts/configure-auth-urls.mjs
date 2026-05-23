#!/usr/bin/env node
/**
 * PATCH Supabase auth config (site_url + redirect allow list) via Management API.
 * Requires SUPABASE_ACCESS_TOKEN in .env (dashboard → Account → Access Tokens).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const envPath = resolve(root, ".env");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  } catch {
    console.error("Missing .env at", envPath);
    process.exit(1);
  }
  return env;
}

function projectRefFromUrl(url) {
  const m = url?.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let siteUrl = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--site-url" && args[i + 1]) siteUrl = args[++i];
  }
  return { siteUrl };
}

function mergeAllowList(existing, siteUrl) {
  const base = siteUrl.replace(/\/$/, "");
  const required = [
    `${base}/**`,
    "http://localhost:5173/**",
    "http://127.0.0.1:5173/**",
  ];
  const current = (existing || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...new Set([...required, ...current])];
  return merged.join(",");
}

const env = loadEnv();
const { siteUrl: cliSiteUrl } = parseArgs();
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = projectRefFromUrl(env.VITE_SUPABASE_URL);
const siteUrl = (cliSiteUrl || env.VITE_APP_URL || "").replace(/\/$/, "");

if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN missing in .env\n" +
      "Create one: https://supabase.com/dashboard/account/tokens\n" +
      "Then re-run: npm run supabase:auth-urls"
  );
  process.exit(1);
}
if (!ref) {
  console.error("Could not parse project ref from VITE_SUPABASE_URL");
  process.exit(1);
}
if (!siteUrl || siteUrl.includes("localhost")) {
  console.error(
    "Set production URL: npm run supabase:auth-urls -- --site-url https://cour-anime.vercel.app"
  );
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const getRes = await fetch(api, { headers: { Authorization: headers.Authorization } });
if (!getRes.ok) {
  console.error("GET auth config failed:", getRes.status, await getRes.text());
  process.exit(1);
}
const current = await getRes.json();

const body = {
  site_url: siteUrl,
  uri_allow_list: mergeAllowList(current.uri_allow_list, siteUrl),
};

const patchRes = await fetch(api, {
  method: "PATCH",
  headers,
  body: JSON.stringify(body),
});

if (!patchRes.ok) {
  console.error("PATCH auth config failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

const updated = await patchRes.json();
console.log("Supabase auth URLs updated.");
console.log("  site_url:", updated.site_url ?? body.site_url);
console.log("  uri_allow_list:", updated.uri_allow_list ?? body.uri_allow_list);
