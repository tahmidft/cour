export function newSeasonEmail({
  titleEn,
  titleJp,
  coverImage,
  bannerImage,
  seasonNumber,
  status,
  airDay,
  appUrl,
  notifyToken,
  showId,
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:'Helvetica Neue',sans-serif;color:#e8e6df;">
  <div style="max-width:560px;margin:0 auto;">
    ${bannerImage ? `<img src="${bannerImage}" width="560" style="display:block;width:100%;height:180px;object-fit:cover;" />` : ""}
    <div style="padding:28px 32px;">
      <div style="font-size:10px;letter-spacing:0.2em;color:#e63946;margin-bottom:4px;">新シーズン検出 / NEW SEASON DETECTED</div>
      <div style="font-size:10px;color:#555;margin-bottom:2px;">${titleJp || ""}</div>
      <div style="font-size:24px;font-weight:600;margin-bottom:16px;">${titleEn}</div>
      ${coverImage ? `<img src="${coverImage}" style="width:80px;height:112px;object-fit:cover;border-radius:4px;float:right;margin-left:16px;" />` : ""}
      <div style="background:#1a1a24;padding:14px;border-radius:4px;margin-bottom:20px;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">SEASON</div>
        <div style="font-size:16px;font-weight:500;">Season ${seasonNumber} — ${status}</div>
        ${airDay ? `<div style="font-size:12px;color:#a0c4f8;margin-top:6px;">📅 ${airDay}</div>` : ""}
      </div>
      <div style="clear:both;"></div>
      <hr style="border:none;border-top:1px solid #ffffff12;margin:20px 0;" />
      <div style="font-size:11px;color:#555;line-height:2;">
        <a href="${appUrl}/unsubscribe?show=${showId}&token=${notifyToken}" style="color:#555;text-decoration:underline;">
          Turn off reminders for ${titleEn}
        </a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${appUrl}/unsubscribe?all=true&token=${notifyToken}" style="color:#555;text-decoration:underline;">
          Turn off all weekly reminders
        </a>
      </div>
      <div style="margin-top:24px;font-size:11px;color:#333;text-align:center;">made with ❤️ by a weeb</div>
    </div>
  </div>
</body>
</html>
  `;
}

export function weeklyReminderEmail({
  titleEn,
  titleJp,
  coverImage,
  episode,
  countdown,
  airTime,
  skipReason,
  appUrl,
  notifyToken,
  showId,
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:'Helvetica Neue',sans-serif;color:#e8e6df;">
  <div style="max-width:560px;margin:0 auto;padding:28px 32px;">
    <div style="font-size:10px;letter-spacing:0.2em;color:#a0c4f8;margin-bottom:4px;">週次リマインダー / WEEKLY REMINDER</div>
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;">
      ${coverImage ? `<img src="${coverImage}" style="width:64px;height:90px;object-fit:cover;border-radius:4px;flex-shrink:0;" />` : ""}
      <div>
        <div style="font-size:10px;color:#555;margin-bottom:2px;">${titleJp || ""}</div>
        <div style="font-size:20px;font-weight:600;margin-bottom:8px;">${titleEn}</div>
        <div style="font-size:14px;color:#a0c4f8;">Episode ${episode} drops in ${countdown}</div>
        ${airTime ? `<div style="font-size:11px;color:#666;margin-top:4px;">${airTime}</div>` : ""}
      </div>
    </div>
    ${
      skipReason
        ? `
    <div style="background:#1a1a10;border-left:2px solid #f5c97a;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:20px;font-size:12px;color:#f5c97a;">
      ⚠️ ${skipReason}
    </div>`
        : ""
    }
    <hr style="border:none;border-top:1px solid #ffffff12;margin:20px 0;" />
    <div style="font-size:11px;color:#555;line-height:2;">
      <a href="${appUrl}/unsubscribe?show=${showId}&token=${notifyToken}" style="color:#555;text-decoration:underline;">
        Turn off weekly reminders for ${titleEn}
      </a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${appUrl}/unsubscribe?all=true&token=${notifyToken}" style="color:#555;text-decoration:underline;">
        Turn off all weekly reminders
      </a>
    </div>
    <div style="margin-top:24px;font-size:11px;color:#333;text-align:center;">made with ❤️ by a weeb</div>
  </div>
</body>
</html>
  `;
}
