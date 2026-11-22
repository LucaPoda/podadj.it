import type {
  OriginalTrackRef,
  PlayedVersion,
  TrackType,
  TracklistEntry,
} from '../../schemas/tracklist';

export interface RawRekordboxTrack {
  trackId: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  label?: string;
  bpm?: number;
  key?: string;
  year?: number;
  rating?: number;
  location?: string;
  kind?: string;
  remixer?: string;
  mix?: string;
  myTags: string[];
  isStreaming: boolean;
}

export interface FormattingAnomaly {
  code:
    | 'MISSING_OR_UNKNOWN'
    | 'MASHUP_BAD_SEPARATOR'
    | 'FEAT_IN_TITLE'
    | 'ARTIST_DUPLICATED_IN_TITLE'
    | 'DOUBLE_SPACES'
    | 'LEADING_SEPARATOR';
  severity: 'warning' | 'error';
  message: string;
}

const STANDARD_SUFFIX_RE =
  /\s*\((?:Extended|Original|Club|Radio|Dub|Instrumental|Vocal)(?:\s+(?:Mix|Edit|Version))?\)/gi;

export function cleanOriginalText(text: string): string {
  return text.replace(STANDARD_SUFFIX_RE, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function cleanNonOriginalText(text: string): string {
  let current = text;
  const nestedParensOrBrackets = /\([^()]*\)|\[[^\[\]]*\]/g;
  while (nestedParensOrBrackets.test(current)) {
    current = current.replace(nestedParensOrBrackets, ' ');
  }
  return current
    .replace(/\s*[-–:]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function splitArtists(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\s*(?:,|&|\b(?:feat|ft|featuring|vs)(?:\.(?=\s|$)|\b))\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function normalizeForMatch(text: string): string {
  if (!text) return '';
  const withoutParenFeat = text.replace(
    /\s*(?:\(|\[)\s*(?:feat|ft|featuring)(?:\.|\b)[^)\]]*(?:\)|\])/gi,
    ' '
  );
  const withoutTrailingFeat = withoutParenFeat.replace(
    /\s*\b(?:feat|ft|featuring)(?:\.|\b).*$/gi,
    ' '
  );
  return withoutTrailingFeat
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeArtistsForMatch(artistText: string): string {
  const parts = splitArtists(artistText);
  if (parts.length === 0) return normalizeForMatch(artistText);
  return parts
    .map((p) => normalizeForMatch(p))
    .filter(Boolean)
    .sort()
    .join('');
}

export function analyzeFormatting(
  title: string,
  artist: string,
  isOriginal: boolean
): FormattingAnomaly[] {
  const anomalies: FormattingAnomaly[] = [];
  const trimmedTitle = title.trim();
  const trimmedArtist = artist.trim();

  if (
    !trimmedTitle ||
    !trimmedArtist ||
    trimmedTitle.includes('???') ||
    trimmedArtist.includes('???')
  ) {
    anomalies.push({
      code: 'MISSING_OR_UNKNOWN',
      severity: 'error',
      message: 'Titolo o artista mancante o marcato con "???".',
    });
  }

  const hasMashupOrBootlegKeyword = /\b(?:mashup|bootleg)\b/i.test(trimmedTitle);
  const hasCanonicalMashupSep = /\s+x\s+/i.test(trimmedTitle);
  if (hasMashupOrBootlegKeyword && !hasCanonicalMashupSep) {
    if (/\s+(?:vs\.?|&)\s+/i.test(trimmedTitle)) {
      anomalies.push({
        code: 'MASHUP_BAD_SEPARATOR',
        severity: 'warning',
        message: 'Mashup/bootleg usa "vs" o "&" al posto del separatore canonico " x ".',
      });
    } else if (/\bmashup\b/i.test(trimmedTitle)) {
      anomalies.push({
        code: 'MASHUP_BAD_SEPARATOR',
        severity: 'warning',
        message: 'Mashup dichiarato senza separatore " x " tra le tracce componenti.',
      });
    }
  }

  if (!isOriginal && /\b(?:feat|ft|featuring)(?:\.|\b)/i.test(trimmedTitle)) {
    anomalies.push({
      code: 'FEAT_IN_TITLE',
      severity: 'warning',
      message: 'Trovato "feat./ft." nel titolo di una traccia non originale: spostarlo nell\'artista.',
    });
  }

  const isNonOriginalByTitle =
    /\b(?:remix|edit|flip|mashup|bootleg|rework|vip)\b/i.test(trimmedTitle);
  if (!isNonOriginalByTitle && trimmedArtist) {
    const artistTokens = splitArtists(trimmedArtist).filter((t) => t.length >= 3);
    const lowerTitle = trimmedTitle.toLowerCase();
    const duplicated = artistTokens.some((tok) => {
      const escaped = tok.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerTitle);
    });
    if (duplicated) {
      anomalies.push({
        code: 'ARTIST_DUPLICATED_IN_TITLE',
        severity: 'warning',
        message: 'Il nome dell\'autore compare duplicato nel titolo.',
      });
    }
  }

  if (/\s{2,}/.test(title) || /\s{2,}/.test(artist)) {
    anomalies.push({
      code: 'DOUBLE_SPACES',
      severity: 'warning',
      message: 'Rilevati spazi doppi o multipli in titolo/artista.',
    });
  }

  if (/^\s*[-_]/.test(title)) {
    anomalies.push({
      code: 'LEADING_SEPARATOR',
      severity: 'warning',
      message: 'Il titolo inizia con "-" o "_".',
    });
  }

  return anomalies;
}

export function normalizeRating(rawRating?: string | number | null): number | undefined {
  if (rawRating === undefined || rawRating === null || rawRating === '') return undefined;
  const numeric = typeof rawRating === 'number' ? rawRating : Number(String(rawRating).trim());
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  if (numeric <= 5 && Number.isInteger(numeric) && numeric !== 0) {
    // Handles already-normalized 1..5 inputs cleanly while 51..255 maps via /51
    return numeric;
  }
  return Math.min(5, Math.max(0, Math.round(numeric / 51)));
}

export function parseYear(rawYear?: string | number | null): number | undefined {
  if (rawYear === undefined || rawYear === null || rawYear === '') return undefined;
  const yr = typeof rawYear === 'number' ? rawYear : parseInt(String(rawYear).trim(), 10);
  if (!Number.isInteger(yr) || yr <= 1900 || yr > 2100) return undefined;
  return yr;
}

function extractParenSuffixLabels(title: string): string[] {
  const matches: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < title.length; i += 1) {
    const ch = title[i];
    if (ch === '(' || ch === '[') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === ')' || ch === ']') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const content = title.slice(start, i).trim();
        if (content) matches.push(content);
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  return matches;
}

function isStandardMixLabel(label: string): boolean {
  return /^(?:Extended|Original|Club|Radio|Dub|Instrumental|Vocal)(?:\s+(?:Mix|Edit|Version))?$/i.test(
    label.trim()
  );
}

export interface DecomposedTrackResult {
  trackType: TrackType;
  playedVersion: PlayedVersion;
  originalTracks: OriginalTrackRef[];
  cleanDisplayTitle: string;
  cleanDisplayArtist: string;
  isOfficialSource: boolean;
}

export function classifyAndDecomposeTrack(raw: RawRekordboxTrack): DecomposedTrackResult {
  const locationLower = (raw.location || '').toLowerCase();
  const isOfficialSource =
    raw.isStreaming ||
    locationLower.startsWith('beatport:') ||
    locationLower.startsWith('beatsource:') ||
    /[/\\]music[/\\]/i.test(raw.location || '');

  const rawTitle = raw.title.trim() || 'Untitled';
  const rawArtist = raw.artist.trim() || 'Unknown Artist';
  const parenLabels = extractParenSuffixLabels(rawTitle);
  const nonStandardLabels = parenLabels.filter((lbl) => !isStandardMixLabel(lbl));
  const versionLabel = nonStandardLabels[nonStandardLabels.length - 1] || raw.mix?.trim();

  const hasMashupSep = /\s+x\s+/i.test(rawTitle);
  const hasMashupKeyword = /\bmashup\b/i.test(rawTitle);
  const hasBootlegKeyword = /\bbootleg\b/i.test(rawTitle);
  const hasEditKeyword =
    nonStandardLabels.some((lbl) => /\b(?:edit|rework|flip|vip|private)\b/i.test(lbl)) ||
    /\b(?:rework|flip|vip|private\s+edit)\b/i.test(rawTitle);
  const hasRemixKeyword =
    nonStandardLabels.some((lbl) => /\bremix\b/i.test(lbl)) ||
    /\bremix\b/i.test(rawTitle) ||
    Boolean(raw.remixer?.trim());

  let trackType: TrackType = 'original';
  if (hasMashupSep || hasMashupKeyword) {
    trackType = 'mashup';
  } else if (hasBootlegKeyword) {
    trackType = 'bootleg';
  } else if (hasEditKeyword) {
    trackType = 'edit';
  } else if (hasRemixKeyword) {
    trackType = 'remix';
  }

  if (trackType === 'mashup') {
    const cleanedFullTitle = cleanNonOriginalText(rawTitle) || cleanOriginalText(rawTitle);
    const titleParts = cleanedFullTitle
      .split(/\s+x\s+/i)
      .map((s) => cleanOriginalText(s))
      .filter(Boolean);

    const rawArtistParts = /\s+x\s+/i.test(rawArtist)
      ? rawArtist.split(/\s+x\s+/i).map((s) => s.trim()).filter(Boolean)
      : splitArtists(rawArtist);

    const originalTracks: OriginalTrackRef[] =
      titleParts.length >= 2
        ? titleParts.map((tPart, idx) => ({
            title: tPart,
            artist: rawArtistParts[idx] || rawArtistParts[0] || rawArtist,
          }))
        : [
            {
              title: cleanedFullTitle || rawTitle,
              artist: rawArtist,
            },
          ];

    return {
      trackType,
      playedVersion: {
        ...(versionLabel ? { label: versionLabel } : { label: 'Mashup' }),
      },
      originalTracks,
      cleanDisplayTitle: rawTitle,
      cleanDisplayArtist: rawArtist,
      isOfficialSource,
    };
  }

  if (trackType === 'remix' || trackType === 'edit' || trackType === 'bootleg') {
    const originalTitle = cleanNonOriginalText(rawTitle) || cleanOriginalText(rawTitle);
    const originalArtist = cleanOriginalText(rawArtist) || rawArtist;
    const defaultLabel =
      trackType === 'bootleg' ? 'Bootleg' : trackType === 'edit' ? 'Edit' : 'Remix';

    return {
      trackType,
      playedVersion: {
        label: versionLabel || (raw.remixer ? `${raw.remixer.trim()} Remix` : defaultLabel),
      },
      originalTracks: [
        {
          title: originalTitle,
          artist: originalArtist,
        },
      ],
      cleanDisplayTitle: rawTitle,
      cleanDisplayArtist: rawArtist,
      isOfficialSource,
    };
  }

  const cleanTitle = cleanOriginalText(rawTitle) || rawTitle;
  const cleanArtist = cleanOriginalText(rawArtist) || rawArtist;

  return {
    trackType: 'original',
    playedVersion: {},
    originalTracks: [
      {
        title: cleanTitle,
        artist: cleanArtist,
      },
    ],
    cleanDisplayTitle: cleanTitle,
    cleanDisplayArtist: cleanArtist,
    isOfficialSource,
  };
}

export function normalizeLocationForHash(location: string): string {
  let decoded = location.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw if malformed URI escape
  }
  return decoded
    .replace(/^file:\/\/localhost/i, '')
    .replace(/^file:\/\//i, '')
    .replace(/\\/g, '/')
    .toLowerCase()
    .trim();
}

export async function hashFilePath(location?: string): Promise<string | undefined> {
  if (!location || !location.trim()) return undefined;
  const normalized = normalizeLocationForHash(location);
  if (!normalized) return undefined;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) non disponibile per calcolo SHA-256');
  }
  const bytes = new TextEncoder().encode(normalized);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildTracklistEntryFromRaw(
  raw: RawRekordboxTrack,
  index: number
): Promise<TracklistEntry> {
  const decomposed = classifyAndDecomposeTrack(raw);
  const filePathHash = await hashFilePath(raw.location);

  return {
    index,
    title: decomposed.cleanDisplayTitle,
    artist: decomposed.cleanDisplayArtist,
    trackType: decomposed.trackType,
    playedVersion: decomposed.playedVersion,
    originalTracks: decomposed.originalTracks,
    ...(raw.bpm && raw.bpm > 0 ? { bpm: Number(raw.bpm.toFixed(2)) } : {}),
    ...(raw.key ? { key: raw.key } : {}),
    ...(raw.genre ? { genre: raw.genre } : {}),
    myTags: raw.myTags,
    ...(raw.rating !== undefined ? { rating: raw.rating } : {}),
    ...(raw.label ? { label: raw.label } : {}),
    ...(raw.year !== undefined ? { releaseYear: raw.year } : {}),
    syncMeta: {
      normalizedTitle: normalizeForMatch(decomposed.cleanDisplayTitle),
      normalizedArtists: normalizeArtistsForMatch(decomposed.cleanDisplayArtist),
      ...(filePathHash ? { filePathHash } : {}),
      ...(raw.trackId ? { lastRekordboxTrackId: raw.trackId } : {}),
    },
  };
}
