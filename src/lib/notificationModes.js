export const NOTIFICATION_MODES = {
  WEEKLY_SUMMARY: "weekly_summary",
  NEW_SEASON_ONLY: "new_season_only",
  DAILY_DIGEST: "daily_digest",
  NONE: "none",
};

export const MODE_OPTIONS = [
  {
    id: NOTIFICATION_MODES.WEEKLY_SUMMARY,
    label: "Weekly summary",
    description: "Every Sunday — all episodes airing that week (Sun–Sat)",
  },
  {
    id: NOTIFICATION_MODES.NEW_SEASON_ONLY,
    label: "New seasons only",
    description: "Only when a sequel or new season is detected — no weekly or daily mail",
  },
  {
    id: NOTIFICATION_MODES.DAILY_DIGEST,
    label: "Daily digest",
    description: "One email per day — episodes airing that day, grouped together",
  },
  {
    id: NOTIFICATION_MODES.NONE,
    label: "No emails",
    description: "Opt out of all COUR notification emails",
  },
];

export function modeLabel(mode) {
  return MODE_OPTIONS.find((o) => o.id === mode)?.label || mode;
}

/** Sunday 00:00 local — week runs Sun–Sat */
export function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function isSunday(date = new Date()) {
  return date.getDay() === 0;
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
