import type { CSSProperties } from 'react';
import { cardFramingConfig } from '../config/imageFraming';
import type { CardDeviceConfig, CardFraming } from '../schemas/imageFraming';

export type PositionXMode = 'left' | 'center' | 'right' | 'custom';
export type PositionYMode = 'top' | 'center' | 'bottom' | 'custom';

export interface ParsedPosition {
  xMode: PositionXMode;
  xPercent: number;
  yMode: PositionYMode;
  yPercent: number;
}

export interface BuiltFramingStyles {
  webp: string;
  jpg: string;
  position: string;
  zoom: number;
  transformOrigin?: string;
  cssText: string;
  reactStyle: CSSProperties;
}

function clampPercent(val: number): number {
  if (!Number.isFinite(val)) return 50;
  return Math.max(0, Math.min(100, Math.round(val)));
}

function parseAxisPercent(token: string, fallback: number): number | null {
  const m = /^(-?\d+(?:\.\d+)?)%$/.exec(token.trim());
  if (!m) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) ? clampPercent(num) : fallback;
}

function parseSingleX(token: string): { mode: PositionXMode; percent: number } {
  const t = token.toLowerCase().trim();
  if (t === 'left') return { mode: 'left', percent: 0 };
  if (t === 'center') return { mode: 'center', percent: 50 };
  if (t === 'right') return { mode: 'right', percent: 100 };
  const pct = parseAxisPercent(t, 50);
  if (pct !== null) return { mode: 'custom', percent: pct };
  return { mode: 'center', percent: 50 };
}

function parseSingleY(token: string): { mode: PositionYMode; percent: number } {
  const t = token.toLowerCase().trim();
  if (t === 'top') return { mode: 'top', percent: 0 };
  if (t === 'center') return { mode: 'center', percent: 50 };
  if (t === 'bottom') return { mode: 'bottom', percent: 100 };
  const pct = parseAxisPercent(t, 50);
  if (pct !== null) return { mode: 'custom', percent: pct };
  return { mode: 'center', percent: 50 };
}

/**
 * Parses a CSS `background-position` string (e.g. "center 45%", "left 55%", "center center")
 * into structured X/Y axis modes and percentage values.
 */
export function parsePositionString(pos: string): ParsedPosition {
  const rawTokens = pos.trim().split(/\s+/).filter(Boolean);

  if (rawTokens.length === 0) {
    return { xMode: 'center', xPercent: 50, yMode: 'center', yPercent: 50 };
  }

  if (rawTokens.length === 1) {
    const t = rawTokens[0].toLowerCase();
    if (t === 'top' || t === 'bottom') {
      const y = parseSingleY(t);
      return { xMode: 'center', xPercent: 50, yMode: y.mode, yPercent: y.percent };
    }
    const x = parseSingleX(t);
    return { xMode: x.mode, xPercent: x.percent, yMode: 'center', yPercent: 50 };
  }

  const [first, second] = rawTokens;
  const fLow = first.toLowerCase();
  const sLow = second.toLowerCase();

  // CSS allows keyword-order swap like "top left" -> normalize to X then Y
  if ((fLow === 'top' || fLow === 'bottom') && (sLow === 'left' || sLow === 'right' || sLow === 'center')) {
    const x = parseSingleX(sLow);
    const y = parseSingleY(fLow);
    return { xMode: x.mode, xPercent: x.percent, yMode: y.mode, yPercent: y.percent };
  }

  const x = parseSingleX(first);
  const y = parseSingleY(second);
  return { xMode: x.mode, xPercent: x.percent, yMode: y.mode, yPercent: y.percent };
}

/**
 * Serializes structured X/Y position back into a valid CSS `background-position` string.
 */
export function formatPositionString(parsed: ParsedPosition): string {
  const xToken = parsed.xMode === 'custom' ? `${clampPercent(parsed.xPercent)}%` : parsed.xMode;
  const yToken = parsed.yMode === 'custom' ? `${clampPercent(parsed.yPercent)}%` : parsed.yMode;
  return `${xToken} ${yToken}`;
}

/**
 * Converts a scale multiplier (e.g. 1.1) into UI percentage (e.g. 110).
 */
export function zoomToPercent(zoom?: number): number {
  const safe = typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0 ? zoom : 1.0;
  return Math.round(safe * 100);
}

/**
 * Converts a UI zoom percentage (e.g. 110) back into a CSS scale multiplier (e.g. 1.1).
 */
export function percentToZoom(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 1.0;
  const clamped = Math.max(50, Math.min(400, pct));
  return Number((clamped / 100).toFixed(2));
}

/**
 * Shared CSS/React style builder for image framing.
 * Preserves byte-for-byte parity with public Astro components and React previews.
 */
export function buildFramingInlineStyles(
  deviceConf: CardDeviceConfig | undefined,
  fallbackWebp: string,
  fallbackJpg?: string,
  options: {
    insetExpand?: boolean;
    overridePreviewUrl?: string;
    filter?: string;
  } = {}
): BuiltFramingStyles {
  const conf = deviceConf ?? {
    position: 'center center',
    zoom: 1.0,
  };
  const webp = conf.imageWebp || fallbackWebp;
  const jpg = conf.imageJpg || fallbackJpg || fallbackWebp.replace('.webp', '.jpg');
  const zoom = conf.zoom || 1.0;
  const origin = conf.transformOrigin ? ` transform-origin: ${conf.transformOrigin};` : '';

  const cssText = `background-image: url('${webp}'), url('${jpg}'); background-position: ${conf.position}; transform: scale(${zoom});${origin}`;

  const bgImageValue = options.overridePreviewUrl
    ? `url('${options.overridePreviewUrl}')`
    : `url('${webp}'), url('${jpg}')`;

  const reactStyle: CSSProperties = {
    backgroundImage: bgImageValue,
    backgroundPosition: conf.position,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    transform: `scale(${zoom})`,
    ...(conf.transformOrigin ? { transformOrigin: conf.transformOrigin } : {}),
    ...(options.filter ? { filter: options.filter } : {}),
    ...(options.insetExpand
      ? { top: '-15px', right: '-15px', bottom: '-15px', left: '-15px' }
      : { inset: 0 }),
  };

  return {
    webp,
    jpg,
    position: conf.position,
    zoom,
    ...(conf.transformOrigin ? { transformOrigin: conf.transformOrigin } : {}),
    cssText,
    reactStyle,
  };
}

const FRAMING_BASE_FALLBACKS: Record<string, string> = {
  'hero-mainstage': 'mainstage-side',
  'quicknav-mainstage': 'mainstage-side',
  'hero-party': 'party-side',
  'quicknav-party': 'party-side',
  'hero-groove': 'groove-side',
  'quicknav-groove': 'groove-side',
  'hero-tech-side': 'tech-side',
  'hero-demo-live': 'demo-live',
  'hero-events': 'events',
  'hero-partyhive': 'partyhive',
};

export function getFramingStyle(
  key: string,
  device: 'desktop' | 'mobile',
  fallbackWebp: string,
  fallbackJpg?: string
): string {
  const fallbackKey = FRAMING_BASE_FALLBACKS[key];
  const conf =
    cardFramingConfig[key]?.[device] ??
    (fallbackKey ? cardFramingConfig[fallbackKey]?.[device] : undefined);
  return buildFramingInlineStyles(conf, fallbackWebp, fallbackJpg).cssText;
}

export function getFramingConfig(key: string): CardFraming | undefined {
  const fallbackKey = FRAMING_BASE_FALLBACKS[key];
  return cardFramingConfig[key] ?? (fallbackKey ? cardFramingConfig[fallbackKey] : undefined);
}
