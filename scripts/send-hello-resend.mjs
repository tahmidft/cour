/**
 * Quick Resend smoke test (matches Resend's "Hello World" example).
 * 1. Paste RESEND_API_KEY=re_... into .env
 * 2. Run: npm run resend:test
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const apiKey = process.env.RESEND_API_KEY?.trim();
if (!apiKey || !apiKey.startsWith("re_") || apiKey.includes("xxxx")) {
  console.error("Add your real RESEND_API_KEY=re_... to .env (replace re_xxxxxxxxx)");
  process.exit(1);
}

const resend = new Resend(apiKey);
const to = process.env.RESEND_TEST_TO || "farhantahmid007@gmail.com";

const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM || "COUR <onboarding@resend.dev>",
  to,
  subject: "COUR — Hello from Resend",
  html: "<p>Congrats on sending your <strong>first COUR email</strong>!</p>",
});

if (error) {
  console.error("Resend error:", error);
  process.exit(1);
}
console.log("Email sent. Id:", data?.id);
