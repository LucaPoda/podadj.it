import type { TracklistData, TracklistEntry } from '../../schemas/tracklist';
import {
  hashFilePath,
  normalizeArtistsForMatch,
  normalizeForMatch,
  type RawRekordboxTrack,
} from './trackNormalizer';
import type { ParsedRekordboxXml } from './xmlParser';

export type SyncMatchConfidence = 'exact' | 'ambiguous' | 'unmatched';

export interface SyncFieldChange {
  field: 'genre' | 'myTags' | 'rating' | 'label' | 'bpm' | 'key' | 'releaseYear';
  before: string;
  after: string;
}

export interface SyncCandidateInfo {
  trackId: string;
  title: string;
  artist: string;
  genre?: string;
  label?: string;
  rating?: number;
  bpm?: number;
  key?: string;
  year?: number;
}

export interface SyncTrackMatchItem {
  tracklistId: string;
  tracklistTitle: string;
  trackIndex: number;
  title: string;
  artist: string;
  confidence: SyncMatchConfidence;
  matchedBy?: 'hash+title' | 'hash' | 'title+artist';
  matchedXmlTrackId?: string;
  changes: SyncFieldChange[];
  candidates?: SyncCandidateInfo[];
  updatedEntry?: TracklistEntry;
}

export interface SyncReport {
  totalTracksChecked: number;
  exactMatches: number;
  ambiguousMatches: number;
  unmatchedTracks: number;
  tracksWithUpdates: number;
  items: SyncTrackMatchItem[];
  updatedTracklists: Record<string, TracklistData>;
}

interface IndexedXmlTrack {
  raw: RawRekordboxTrack;
  normalizedTitle: string;
  normalizedArtists: string;
  titleArtistKey: string;
  filePathHash?: string;
}

function formatVal(val: unknown): string {
  if (val === undefined || val === null) return '—';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—';
  return String(val);
}

function buildUpdatedEntryAndDiff(
  entry: TracklistEntry,
  indexed: IndexedXmlTrack
): { updated: TracklistEntry; changes: SyncFieldChange[] } {
  const raw = indexed.raw;
  const changes: SyncFieldChange[] = [];

  const nextGenre = raw.genre || entry.genre;
  if (nextGenre !== entry.genre) {
    changes.push({ field: 'genre', before: formatVal(entry.genre), after: formatVal(nextGenre) });
  }

  const nextMyTags = raw.myTags.length > 0 ? raw.myTags : entry.myTags;
  if (JSON.stringify(nextMyTags) !== JSON.stringify(entry.myTags)) {
    changes.push({ field: 'myTags', before: formatVal(entry.myTags), after: formatVal(nextMyTags) });
  }

  const nextRating = raw.rating !== undefined ? raw.rating : entry.rating;
  if (nextRating !== entry.rating) {
    changes.push({ field: 'rating', before: formatVal(entry.rating), after: formatVal(nextRating) });
  }

  const nextLabel = raw.label || entry.label;
  if (nextLabel !== entry.label) {
    changes.push({ field: 'label', before: formatVal(entry.label), after: formatVal(nextLabel) });
  }

  const nextBpm = raw.bpm ? Number(raw.bpm.toFixed(2)) : entry.bpm;
  if (nextBpm !== entry.bpm) {
    changes.push({ field: 'bpm', before: formatVal(entry.bpm), after: formatVal(nextBpm) });
  }

  const nextKey = raw.key || entry.key;
  if (nextKey !== entry.key) {
    changes.push({ field: 'key', before: formatVal(entry.key), after: formatVal(nextKey) });
  }

  const nextYear = raw.year !== undefined ? raw.year : entry.releaseYear;
  if (nextYear !== entry.releaseYear) {
    changes.push({
      field: 'releaseYear',
      before: formatVal(entry.releaseYear),
      after: formatVal(nextYear),
    });
  }

  // Strictly preserve manual Spotify/SoundCloud preview links on playedVersion & originalTracks
  const updated: TracklistEntry = {
    ...entry,
    ...(nextGenre ? { genre: nextGenre } : {}),
    myTags: nextMyTags,
    ...(nextRating !== undefined ? { rating: nextRating } : {}),
    ...(nextLabel ? { label: nextLabel } : {}),
    ...(nextBpm !== undefined ? { bpm: nextBpm } : {}),
    ...(nextKey ? { key: nextKey } : {}),
    ...(nextYear !== undefined ? { releaseYear: nextYear } : {}),
    syncMeta: {
      normalizedTitle: entry.syncMeta.normalizedTitle || indexed.normalizedTitle,
      normalizedArtists: entry.syncMeta.normalizedArtists || indexed.normalizedArtists,
      ...(indexed.filePathHash || entry.syncMeta.filePathHash
        ? { filePathHash: indexed.filePathHash || entry.syncMeta.filePathHash }
        : {}),
      lastRekordboxTrackId: raw.trackId,
    },
  };

  return { updated, changes };
}

export function applySelectedCandidateToEntry(
  entry: TracklistEntry,
  raw: RawRekordboxTrack,
  filePathHash?: string
): { updated: TracklistEntry; changes: SyncFieldChange[] } {
  const normTitle = normalizeForMatch(raw.title);
  const normArtists = normalizeArtistsForMatch(raw.artist);
  return buildUpdatedEntryAndDiff(entry, {
    raw,
    normalizedTitle: normTitle,
    normalizedArtists: normArtists,
    titleArtistKey: `${normTitle}::${normArtists}`,
    filePathHash,
  });
}

export async function syncTracklistsWithXml(
  tracklists: TracklistData[],
  parsedXml: ParsedRekordboxXml
): Promise<SyncReport> {
  const byHash = new Map<string, IndexedXmlTrack[]>();
  const byTitleArtist = new Map<string, IndexedXmlTrack[]>();

  const rawValues = Object.values(parsedXml.tracksById);
  for (const raw of rawValues) {
    const normalizedTitle = normalizeForMatch(raw.title);
    const normalizedArtists = normalizeArtistsForMatch(raw.artist);
    const titleArtistKey = `${normalizedTitle}::${normalizedArtists}`;
    const filePathHash = await hashFilePath(raw.location);

    const indexed: IndexedXmlTrack = {
      raw,
      normalizedTitle,
      normalizedArtists,
      titleArtistKey,
      filePathHash,
    };

    if (filePathHash) {
      const list = byHash.get(filePathHash) || [];
      list.push(indexed);
      byHash.set(filePathHash, list);
    }

    const taList = byTitleArtist.get(titleArtistKey) || [];
    taList.push(indexed);
    byTitleArtist.set(titleArtistKey, taList);
  }

  const items: SyncTrackMatchItem[] = [];
  const updatedTracklists: Record<string, TracklistData> = {};

  let totalTracksChecked = 0;
  let exactMatches = 0;
  let ambiguousMatches = 0;
  let unmatchedTracks = 0;
  let tracksWithUpdates = 0;

  for (const tracklist of tracklists) {
    let tracklistChanged = false;
    const nextTracks: TracklistEntry[] = [];

    for (const entry of tracklist.tracks) {
      totalTracksChecked += 1;
      const normTitle = entry.syncMeta.normalizedTitle || normalizeForMatch(entry.title);
      const normArtists =
        entry.syncMeta.normalizedArtists || normalizeArtistsForMatch(entry.artist);
      const taKey = `${normTitle}::${normArtists}`;

      const hashMatches = entry.syncMeta.filePathHash
        ? byHash.get(entry.syncMeta.filePathHash) || []
        : [];
      const taMatches = byTitleArtist.get(taKey) || [];

      let chosen: IndexedXmlTrack | null = null;
      let matchedBy: SyncTrackMatchItem['matchedBy'];
      let confidence: SyncMatchConfidence = 'unmatched';
      let candidates: IndexedXmlTrack[] = [];

      // Double-check matching (never trust TrackID alone)
      if (hashMatches.length === 1 && taMatches.some((m) => m.raw.trackId === hashMatches[0].raw.trackId)) {
        chosen = hashMatches[0];
        matchedBy = 'hash+title';
        confidence = 'exact';
      } else if (hashMatches.length === 1 && taMatches.length === 0) {
        // File path hash uniquely identifies the same audio file even if title was tweaked
        chosen = hashMatches[0];
        matchedBy = 'hash';
        confidence = 'exact';
      } else if (!entry.syncMeta.filePathHash && taMatches.length === 1) {
        chosen = taMatches[0];
        matchedBy = 'title+artist';
        confidence = 'exact';
      } else if (hashMatches.length === 0 && taMatches.length === 1) {
        // Track moved/re-encoded locally (different path hash), unique title+artist match
        chosen = taMatches[0];
        matchedBy = 'title+artist';
        confidence = 'exact';
      } else if (hashMatches.length > 0 || taMatches.length > 0) {
        confidence = 'ambiguous';
        const merged = new Map<string, IndexedXmlTrack>();
        for (const m of [...hashMatches, ...taMatches]) {
          merged.set(m.raw.trackId, m);
        }
        candidates = Array.from(merged.values());
      }

      if (confidence === 'exact' && chosen) {
        exactMatches += 1;
        const { updated, changes } = buildUpdatedEntryAndDiff(entry, chosen);
        if (changes.length > 0) {
          tracksWithUpdates += 1;
          tracklistChanged = true;
        } else if (updated.syncMeta.lastRekordboxTrackId !== entry.syncMeta.lastRekordboxTrackId) {
          tracklistChanged = true;
        }
        nextTracks.push(updated);
        items.push({
          tracklistId: tracklist.id,
          tracklistTitle: tracklist.title,
          trackIndex: entry.index,
          title: entry.title,
          artist: entry.artist,
          confidence: 'exact',
          matchedBy,
          matchedXmlTrackId: chosen.raw.trackId,
          changes,
          updatedEntry: updated,
        });
      } else if (confidence === 'ambiguous') {
        ambiguousMatches += 1;
        nextTracks.push(entry);
        items.push({
          tracklistId: tracklist.id,
          tracklistTitle: tracklist.title,
          trackIndex: entry.index,
          title: entry.title,
          artist: entry.artist,
          confidence: 'ambiguous',
          changes: [],
          candidates: candidates.map((c) => ({
            trackId: c.raw.trackId,
            title: c.raw.title,
            artist: c.raw.artist,
            genre: c.raw.genre,
            label: c.raw.label,
            rating: c.raw.rating,
            bpm: c.raw.bpm,
            key: c.raw.key,
            year: c.raw.year,
          })),
        });
      } else {
        unmatchedTracks += 1;
        nextTracks.push(entry);
        items.push({
          tracklistId: tracklist.id,
          tracklistTitle: tracklist.title,
          trackIndex: entry.index,
          title: entry.title,
          artist: entry.artist,
          confidence: 'unmatched',
          changes: [],
        });
      }
    }

    if (tracklistChanged) {
      updatedTracklists[tracklist.id] = {
        ...tracklist,
        updatedAt: new Date().toISOString(),
        tracks: nextTracks,
      };
    }
  }

  return {
    totalTracksChecked,
    exactMatches,
    ambiguousMatches,
    unmatchedTracks,
    tracksWithUpdates,
    items,
    updatedTracklists,
  };
}
