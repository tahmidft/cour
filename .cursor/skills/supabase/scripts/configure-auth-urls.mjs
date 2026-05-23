#!/usr/bin/env node
/**
 * Inspect or PATCH Supabase auth config (redirect URLs + magic-link email template).
 * Requires SUPABASE_ACCESS_TOKEN in .env (dashboard → Account → Access Tokens).
 *
 *   npm run supabase:auth-check
 *   npm run supabase:auth-urls
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const envPath = resolve(root, ".env");

const DEFAULT_MAGIC_LINK_TEMPLATE =
  '<h2>Magic Link</h2><p>Follow this link to login:</p><p><a href="{{ .ConfirmationURL }}">Log In</a></p>';

const DASHBOARD_URL =
  "https://supabase.com/dashboard/project/kmaydeqxhlpuolmcolso/auth/url-configuration";

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
  let checkOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--site-url" && args[i + 1]) siteUrl = args[++i];
    if (args[i] === "--check") checkOnly = true;
  }
  return { siteUrl, checkOnly };
}

function mergeAllowList(existing, siteUrl) {
  const base = siteUrl.replace(/\/$/, "");
  const required = [
    `${base}/**`,
    "http://localhost:5173/**",
    "http://127.0.0.1:5173/**",
    "http://localhost:3000/**",
    "http://127.0.0.1:3000/**",
  ];
  const current = (existing || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...required, ...current])].join(",");
}

function allowsLocalhost3000(uriAllowList) {
  const entries = (uriAllowList || "").split(",").map((s) => s.trim());
  return entries.some(
    (e) =>
      e === "http://localhost:3000/**" ||
      e === "http://localhost:3000/auth" ||
      e === "http://localhost:3000/*"
  );
}

function printAuthDiagnostics(config) {
  console.log("\n--- Supabase auth config ---");
  console.log("site_url:", config.site_url ?? "(unset)");
  console.log("uri_allow_list:\n ", (config.uri_allow_list || "(empty)").replace(/,/g, "\n  "));

  const template = config.mailer_templates_magic_link_content || "";
  console.log("\nmagic_link email template:");
  if (!template) {
    console.log("  (empty — using Supabase default)");
  } else {
    console.log(" ", template.slice(0, 200).replace(/\n/g, " "), template.length > 200 ? "…" : "");
    if (template.includes("{{ .SiteURL }}") && !template.includes("{{ .ConfirmationURL }}")) {
      console.log("\n  ⚠ Template uses {{ .SiteURL }} without {{ .ConfirmationURL }}.");
      console.log("    Magic links will always open the Site URL (production), not localhost.");
    } else if (!template.includes("{{ .ConfirmationURL }}")) {
      console.log("\n  ⚠ Template missing {{ .ConfirmationURL }} — local redirects may not work.");
    } else {
      console.log("\n  ✓ Template uses {{ .ConfirmationURL }} (good).");
    }
  }

  if (!allowsLocalhost3000(config.uri_allow_list)) {
    console.log("\n  ⚠ Missing redirect URL: http://localhost:3000/**");
    console.log("    Add it in:", DASHBOARD_URL);
    console.log("    Use ** (double star), not a single * — /auth needs ** to match.");
  } else {
    console.log("\n  ✓ http://localhost:3000/** is in the redirect allow list.");
  }

  console.log("\nAfter changing Supabase settings, request a NEW magic link from http://localhost:3000/auth");
  console.log("(Old emails still point at the previous redirect.)\n");
}

const env = loadEnv();
const { siteUrl: cliSiteUrl, checkOnly } = parseArgs();
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = projectRefFromUrl(env.VITE_SUPABASE_URL);
const productionSiteUrl = (cliSiteUrl || "https://cour-anime.vercel.app").replace(/\/$/, "");

if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN missing in .env\n" +
      "Create one: https://supabase.com/dashboard/account/tokens\n" +
      "Scopes: auth_config_write\n\n" +
      "Manual fix:\n" +
      "  1. " +
      DASHBOARD_URL +
      "\n" +
      "  2. Redirect URLs → add http://localhost:3000/**\n" +
      "  3. Email Templates → Magic Link → link href must be {{ .ConfirmationURL }}\n"
  );
  process.exit(1);
}
if (!ref) {
  console.error("Could not parse project ref from VITE_SUPABASE_URL");
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

if (checkOnly) {
  printAuthDiagnostics(current);
  process.exit(0);
}

const template = current.mailer_templates_magic_link_content || "";
const needsTemplateFix =
  template.includes("{{ .SiteURL }}") && !template.includes("{{ .ConfirmationURL }}");

const body = {
  site_url: productionSiteUrl,
  uri_allow_list: mergeAllowList(current.uri_allow_list, productionSiteUrl),
};

if (needsTemplateFix || !template.includes("{{ .ConfirmationURL }}")) {
  body.mailer_templates_magic_link_content = DEFAULT_MAGIC_LINK_TEMPLATE;
  console.log("Resetting magic-link email template to use {{ .ConfirmationURL }}");
}

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
printAuthDiagnostics(updated);
