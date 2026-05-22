function prefFooter({ appUrl, notifyToken, emailType }) {
  const u = (params) =>
    params
      ? `${appUrl}/unsubscribe?token=${notifyToken}&${params}`
      : `${appUrl}/unsubscribe?token=${notifyToken}`;
  const typeLink = emailType
    ? `<a href="${u(`disable=${emailType}`)}" style="color:#888;text-decoration:underline;">Turn off ${labelForType(emailType)}</a>`
    : "";
  return `
    <hr style="border:none;border-top:1px solid #ffffff12;margin:20px 0;" />
    <div style="font-size:11px;color:#888;line-height:2;">
      ${typeLink}
      ${typeLink ? "&nbsp;&nbsp;·&nbsp;&nbsp;" : ""}
      <a href="${u("disable=all")}" style="color:#888;text-decoration:underline;">Turn off all COUR emails</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${u("")}" style="color:#888;text-decoration:underline;">Manage email preferences</a>
    </div>
    <div style="margin-top:24px;font-size:11px;color:#444;text-align:center;">made with ❤️ by a weeb</div>
  `;
}

function labelForType(t) {
  const m = {
    weekly_summary: "weekly summaries",
    new_season_only: "new season alerts",
    daily_digest: "daily digests",
  };
  return m[t] || t;
}

function shell(title, subtitle, body, footer) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:'Helvetica Neue',sans-serif;color:#e8e6df;">
  <div style="max-width:560px;margin:0 auto;padding:28px 32px;">
    <div style="font-size:10px;letter-spacing:0.2em;color:#a0c4f8;margin-bottom:4px;">${subtitle}</div>
    <div style="font-size:22px;font-weight:600;margin-bottom:20px;">${title}</div>
    ${body}
    ${footer}
  </div>
</body>
</html>`;
}

export function newSeasonEmail({
  titleEn,
  titleJp,
  coverImage,
  bannerImage,
  seasonNumber,
  status,
  appUrl,
  notifyToken,
  showId,
}) {
  const body = `
    ${bannerImage ? `<img src="${bannerImage}" width="100%" style="max-height:160px;object-fit:cover;border-radius:4px;margin-bottom:16px;" />` : ""}
    <div style="font-size:10px;color:#888;margin-bottom:2px;">${titleJp || ""}</div>
    <div style="background:#1a1a24;padding:14px;border-radius:4px;">
      <div style="font-size:11px;color:#888;">NEW SEASON</div>
      <div style="font-size:16px;font-weight:500;margin-top:6px;">${titleEn} — Season ${seasonNumber}</div>
      <div style="font-size:12px;color:#a0c4f8;margin-top:6px;">${status}</div>
    </div>`;
  return shell(
    titleEn,
    "新シーズン / NEW SEASON",
    body,
    prefFooter({ appUrl, notifyToken, emailType: "new_season_only" })
  );
}

export function weeklySummaryEmail({ weekLabel, items, appUrl, notifyToken }) {
  const rows = items
    .map(
      (s) => `
    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff10;">
      ${s.coverImage ? `<img src="${s.coverImage}" style="width:40px;height:56px;object-fit:cover;border-radius:3px;" />` : ""}
      <div>
        <div style="font-size:11px;font-weight:500;">${s.titleEn}</div>
        <div style="font-size:10px;color:#888;">Ep ${s.episode} · ${s.when}</div>
      </div>
    </div>`
    )
    .join("");
  const body =
    items.length > 0
      ? `<div style="font-size:11px;color:#888;margin-bottom:12px;">${weekLabel}</div>${rows}`
      : `<p style="font-size:12px;color:#888;">No episodes scheduled this week for your tracked shows.</p>`;
  return shell(
    "Your week on COUR",
    "週次まとめ / WEEKLY SUMMARY",
    body,
    prefFooter({ appUrl, notifyToken, emailType: "weekly_summary" })
  );
}

export function dailyDigestEmail({ dateLabel, items, appUrl, notifyToken }) {
  const rows = items
    .map(
      (s) => `
    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff10;">
      ${s.coverImage ? `<img src="${s.coverImage}" style="width:40px;height:56px;object-fit:cover;border-radius:3px;" />` : ""}
      <div>
        <div style="font-size:11px;font-weight:500;">${s.titleEn}</div>
        <div style="font-size:10px;color:#888;">Ep ${s.episode}${s.time ? ` · ${s.time}` : ""}</div>
      </div>
    </div>`
    )
    .join("");
  const body =
    items.length > 0
      ? `<div style="font-size:11px;color:#888;margin-bottom:12px;">${dateLabel}</div>${rows}`
      : `<p style="font-size:12px;color:#888;">Nothing airing today for your tracked shows.</p>`;
  return shell(
    "Today's episodes",
    "本日の配信 / DAILY DIGEST",
    body,
    prefFooter({ appUrl, notifyToken, emailType: "daily_digest" })
  );
}
