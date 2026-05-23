import { Resend } from "resend";

let client;
export function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const RESEND_FROM = process.env.RESEND_FROM || "COUR <onboarding@resend.dev>";

export async function sendCourEmail({ to, subject, html }) {
  const resend = getResend();
  if (!resend || !to) return { ok: false, error: "Email not configured" };
  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    html,
  });
  return error ? { ok: false, error } : { ok: true };
}
