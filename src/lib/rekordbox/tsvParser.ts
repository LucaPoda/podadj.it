import type { TracklistEntry } from '../../schemas/tracklist';
import {
  analyzeFormatting,
  buildTracklistEntryFromRaw,
  normalizeRating,
  parseYear,
  type FormattingAnomaly,
  type RawRekordboxTrack,
} from './trackNormalizer';

export interface ParseDelimitedOptions {
  includeColorTag?: boolean;
}

export interface DelimitedParseResult {
  entries: TracklistEntry[];
  anomaliesByIndex: Record<number, FormattingAnomaly[]>;
  detectedColumns: string[];
  totalRows: number;
  delimiter: string;
}

/**
 * Decodes ArrayBuffer / Uint8Array / string from Rekordbox single-playlist exports.
 * Supports UTF-16 LE/BE with BOM (Rekordbox default) and UTF-8 with or without BOM.
 */
export function decodeRekordboxTextFile(input: ArrayBuffer | Uint8Array | string): string {
  if (typeof input === 'string') {
    return input.replace(/^\uFEFF/, '');
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length >= 2) {
    // UTF-16 LE BOM: FF FE
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(bytes.subarray(2)).replace(/^\uFEFF/, '');
    }
    // UTF-16 BE BOM: FE FF
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(bytes.subarray(2)).replace(/^\uFEFF/, '');
    }
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  // Heuristic check for UTF-16LE without BOM (many 0x00 bytes on odd positions)
  if (bytes.length >= 8 && bytes.length % 2 === 0) {
    let oddNulls = 0;
    let evenNulls = 0;
    const sampleLimit = Math.min(bytes.length, 200);
    for (let i = 0; i < sampleLimit; i += 2) {
      if (bytes[i] === 0) evenNulls += 1;
      if (bytes[i + 1] === 0) oddNulls += 1;
    }
    const pairs = sampleLimit / 2;
    if (oddNulls > pairs * 0.4 && evenNulls < pairs * 0.1) {
      return new TextDecoder('utf-16le').decode(bytes);
    }
    if (evenNulls > pairs * 0.4 && oddNulls < pairs * 0.1) {
      return new TextDecoder('utf-16be').decode(bytes);
    }
  }

  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
}

function detectDelimiter(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) return '\t';
  if (semiCount > commaCount && semiCount > 0) return ';';
  if (commaCount > 0) return ',';
  return '\t';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseStarOrNumericRating(raw?: string): number | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('*')) {
    const stars = (trimmed.match(/\*/g) || []).length;
    return Math.min(5, Math.max(0, stars));
  }
  return normalizeRating(trimmed);
}

function normalizeHeaderKey(col: string): string {
  return col
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, '');
}

export async function parseRekordboxDelimitedText(
  rawText: string,
  options: ParseDelimitedOptions = {}
): Promise<DelimitedParseResult> {
  const includeColorTag = options.includeColorTag ?? true;
  const cleanText = rawText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = cleanText.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      'Il file o testo incollato deve contenere almeno una riga di intestazione e una riga traccia.'
    );
  }

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = splitDelimitedLine(lines[0], delimiter);
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, idx) => {
    headerMap.set(normalizeHeaderKey(h), idx);
  });

  const getCell = (cells: string[], aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias);
      if (idx !== undefined && cells[idx] !== undefined) {
        return cells[idx].trim();
      }
    }
    return '';
  };

  const hasTitleCol = headerMap.has('tracktitle') || headerMap.has('title') || headerMap.has('name');
  const hasArtistCol = headerMap.has('artist');
  if (!hasTitleCol && !hasArtistCol) {
    throw new Error(
      'Intestazioni Rekordbox non riconosciute (attese almeno "Track Title" e "Artist").'
    );
  }

  const entries: TracklistEntry[] = [];
  const anomaliesByIndex: Record<number, FormattingAnomaly[]> = {};

  let seq = 1;
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx += 1) {
    const cells = splitDelimitedLine(lines[lineIdx], delimiter);
    if (cells.every((c) => !c)) continue;

    const title = getCell(cells, ['tracktitle', 'title', 'name']);
    const artist = getCell(cells, ['artist']);
    if (!title && !artist) continue;

    const bpmRaw = getCell(cells, ['bpm', 'averagebpm']).replace(',', '.');
    const bpmNum = bpmRaw ? Number(bpmRaw) : undefined;
    const key = getCell(cells, ['key', 'tonality']);
    const genre = getCell(cells, ['genre']);
    const remixer = getCell(cells, ['remixer']);
    const location = getCell(cells, ['location']);
    const album = getCell(cells, ['album']);
    const label = getCell(cells, ['label']);
    const yearRaw = getCell(cells, ['year', 'releaseyear']);
    const ratingRaw = getCell(cells, ['rating']);
    const colorRaw = getCell(cells, ['color', 'colour']);
    const myTagRaw = getCell(cells, ['mytag', 'mytags']);
    const kind = getCell(cells, ['kind', 'format']);

    // Explicitly ignore `Comments` column to keep My Tag clean without comment leaks
    const myTags = Array.from(
      new Set([
        ...(myTagRaw
          ? myTagRaw
              .split(/[,;/]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : []),
        ...(includeColorTag && colorRaw ? [colorRaw] : []),
      ])
    );

    const locLower = location.toLowerCase();
    const isStreaming =
      locLower.startsWith('beatport:') ||
      locLower.startsWith('beatsource:') ||
      locLower.startsWith('soundcloud:') ||
      locLower.startsWith('tidal:') ||
      locLower.includes('/beatport/') ||
      locLower.includes('\\beatport\\') ||
      kind === 'Unknown Format';

    const rawTrack: RawRekordboxTrack = {
      trackId: `file-row-${seq}`,
      title,
      artist,
      ...(album ? { album } : {}),
      ...(genre ? { genre } : {}),
      ...(label ? { label } : {}),
      ...(bpmNum && Number.isFinite(bpmNum) && bpmNum > 0 ? { bpm: bpmNum } : {}),
      ...(key ? { key } : {}),
      year: parseYear(yearRaw),
      rating: parseStarOrNumericRating(ratingRaw),
      ...(location ? { location } : {}),
      ...(kind ? { kind } : {}),
      ...(remixer ? { remixer } : {}),
      myTags,
      isStreaming,
    };

    const entry = await buildTracklistEntryFromRaw(rawTrack, seq);
    // Do not persist synthetic `file-row-*` as a Rekordbox Collection TrackID
    delete entry.syncMeta.lastRekordboxTrackId;

    const anomalies = analyzeFormatting(
      entry.title,
      entry.artist,
      entry.trackType === 'original'
    );
    if (anomalies.length > 0) {
      anomaliesByIndex[entry.index] = anomalies;
    }

    entries.push(entry);
    seq += 1;
  }

  return {
    entries,
    anomaliesByIndex,
    detectedColumns: rawHeaders,
    totalRows: entries.length,
    delimiter,
  };
}
