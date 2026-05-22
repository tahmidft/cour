const cache = new Map();

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h /= 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Mute extracted colors so text stays readable on row backgrounds. */
export function toAccessiblePalette([r, g, b], isDark) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const sat = clamp(s * (isDark ? 0.55 : 0.35), 0.12, isDark ? 0.45 : 0.28);
  const light = isDark ? clamp(l * 0.35, 0.08, 0.22) : clamp(0.94 - (1 - l) * 0.08, 0.92, 0.98);
  const primary = hslToRgb(h, sat, light);

  const sat2 = clamp(sat * 0.85, 0.1, isDark ? 0.4 : 0.25);
  const light2 = isDark ? clamp(light + 0.06, 0.1, 0.28) : clamp(light - 0.03, 0.88, 0.96);
  const secondary = hslToRgb((h + 18) % 360, sat2, light2);

  return {
    primary: toHex(primary),
    secondary: toHex(secondary),
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function extractFromImageData(data) {
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    const [h, s, l] = rgbToHsl(r, g, b);
    if (l < 0.08 || l > 0.92 || s < 0.12) continue;

    const key = `${Math.round(h / 24)}-${Math.round(s * 4)}`;
    const prev = buckets.get(key) || { r: 0, g: 0, b: 0, w: 0 };
    const weight = s * (1 - Math.abs(l - 0.45));
    prev.r += r * weight;
    prev.g += g * weight;
    prev.b += b * weight;
    prev.w += weight;
    buckets.set(key, prev);
  }

  const ranked = [...buckets.values()]
    .filter((b) => b.w > 0)
    .map((b) => [
      Math.round(b.r / b.w),
      Math.round(b.g / b.w),
      Math.round(b.b / b.w),
      b.w,
    ])
    .sort((a, b) => b[3] - a[3]);

  if (!ranked.length) return null;

  const primary = ranked[0].slice(0, 3);
  const secondary = (ranked[1] || ranked[0]).slice(0, 3);
  return { primary, secondary };
}

export async function getCoverPalette(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);

  const promise = (async () => {
    try {
      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      const size = 48;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const raw = extractFromImageData(data);
      if (!raw) return null;
      return {
        primary: raw.primary,
        secondary: raw.secondary,
      };
    } catch {
      return null;
    }
  })();

  cache.set(url, promise);
  return promise;
}

export function buildRowBackground(palette, isDark, hovered) {
  const base = isDark ? "#13131a" : "#ffffff";
  const hoverBase = isDark ? "#1a1a28" : "#f5f5fb";
  if (!palette) return hovered ? hoverBase : base;

  const { primary, secondary } = toAccessiblePalette(palette.primary, isDark);
  const { primary: primary2 } = toAccessiblePalette(palette.secondary, isDark);

  const left = hovered ? (isDark ? 0.42 : 0.22) : isDark ? 0.32 : 0.16;
  const mid = hovered ? (isDark ? 0.28 : 0.14) : isDark ? 0.2 : 0.1;
  const tail = hovered ? (isDark ? 0.14 : 0.08) : isDark ? 0.1 : 0.05;

  return `linear-gradient(90deg, ${primary}${alphaHex(left)} 0%, ${primary2}${alphaHex(mid)} 80px, ${secondary}${alphaHex(tail)} 160px, ${hovered ? hoverBase : base} 100%)`;
}

function alphaHex(opacity) {
  return Math.round(clamp(opacity, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
}

export function buildCoverFallback(palette, isDark) {
  if (!palette) {
    return isDark
      ? "linear-gradient(135deg, #1a1a24, #2a2a38)"
      : "linear-gradient(135deg, #e8e8ef, #f5f5fb)";
  }
  const { primary, secondary } = toAccessiblePalette(palette.primary, isDark);
  const { primary: secondaryTone } = toAccessiblePalette(palette.secondary, isDark);
  return `linear-gradient(135deg, ${primary}, ${secondaryTone || secondary})`;
}
