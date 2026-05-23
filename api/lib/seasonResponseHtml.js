function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · COUR</title>
</head>
<body style="margin:0;background:#0d0d12;color:#e8e6df;font-family:'Helvetica Neue',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div style="max-width:420px;width:100%;background:#13131a;border:1px solid rgba(255,255,255,0.08);padding:28px 24px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:0.12em;margin-bottom:8px;">COUR</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:#a0c4f8;margin-bottom:20px;">クール</div>
    ${body}
  </div>
</body>
</html>`;
}

function dashLink(appUrl) {
  return `<a href="${appUrl}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;border:1px solid rgba(255,255,255,0.2);color:#e8e6df;text-decoration:none;font-size:10px;letter-spacing:0.1em;">Open dashboard</a>`;
}

export function seasonTrackSuccessHtml({ titleEn, seasonNumber, appUrl }) {
  return layout(
    "Added to your list",
    `
    <div style="font-size:32px;margin-bottom:12px;">✓</div>
    <h1 style="margin:0 0 8px;font-size:18px;font-weight:600;">Season ${seasonNumber} is on your list</h1>
    <p style="font-size:13px;line-height:1.6;color:#b8b6b0;margin:0;">
      <strong style="color:#e8e6df;">${titleEn}</strong> was added to your tracked shows.
      You'll get weekly episode summaries when your email preferences include them.
    </p>
  <a href="${appUrl}/dashboard" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#a0c4f8;color:#0d0d12;text-decoration:none;font-size:11px;letter-spacing:0.12em;font-weight:600;">OPEN DASHBOARD</a>
    `
  );
}

export function seasonAlreadyTrackedHtml({ titleEn, appUrl }) {
  return layout(
    "Already tracking",
    `
    <p style="font-size:13px;line-height:1.6;color:#b8b6b0;margin:0;">
      <strong style="color:#e8e6df;">${titleEn}</strong> is already on your list.
    </p>
    ${dashLink(appUrl)}
    `
  );
}

export function seasonDismissedHtml({ titleEn, seasonNumber, appUrl }) {
  return layout(
    "Got it",
    `
    <p style="font-size:13px;line-height:1.6;color:#b8b6b0;margin:0;">
      We won't ask again about tracking Season ${seasonNumber} of <strong style="color:#e8e6df;">${titleEn}</strong>.
      You can still add it anytime from the app.
    </p>
    ${dashLink(appUrl)}
    `
  );
}

export function seasonErrorHtml({ message, appUrl }) {
  return layout(
    "Something went wrong",
    `
    <p style="font-size:13px;line-height:1.6;color:#c8222a;margin:0 0 8px;">${message}</p>
    <p style="font-size:12px;color:#888;margin:0;">Try again from the COUR app or request a new email.</p>
    ${dashLink(appUrl)}
    `
  );
}
