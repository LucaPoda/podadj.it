import {
  cleanNonOriginalText,
  cleanOriginalText,
  normalizeForMatch,
  splitArtists,
} from './rekordbox/trackNormalizer';

export interface SpotifyCandidate {
  spotifyUrl: string;
  spotifyId: string;
  title: string;
  artist: string;
  albumYear?: number;
  previewAvailable: boolean;
  score: number;
}

export interface SpotifySearchQueryItem {
  queryId: string;
  title: string;
  artist: string;
  playedLabel?: string;
  originalTracks?: Array<{ title: string; artist: string }>;
}

export interface SpotifyOriginalSearchResult {
  index: number;
  title: string;
  artist: string;
  candidates: SpotifyCandidate[];
}

export interface SpotifyBatchQueryResult {
  queryId: string;
  playedVersionCandidates: SpotifyCandidate[];
  originalResults: SpotifyOriginalSearchResult[];
}

export class SpotifyConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`Missing Spotify environment variable(s): ${missing.join(', ')}`);
    this.name = 'SpotifyConfigError';
    this.missing = missing;
  }
}

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
  }
}

type FetchLike = typeof fetch;

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;

function readEnv(name: 'SPOTIFY_CLIENT_ID' | 'SPOTIFY_CLIENT_SECRET'): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
  const val = (fromProcess ?? fromImportMeta ?? '').trim();
  return val.length > 0 ? val : undefined;
}

export function getSpotifyCredentials(): { clientId: string; clientSecret: string } {
  const clientId = readEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = readEnv('SPOTIFY_CLIENT_SECRET');
  const missing: string[] = [];
  if (!clientId) missing.push('SPOTIFY_CLIENT_ID');
  if (!clientSecret) missing.push('SPOTIFY_CLIENT_SECRET');
  if (missing.length > 0) {
    throw new SpotifyConfigError(missing);
  }
  return { clientId: clientId!, clientSecret: clientSecret! };
}

export function clearSpotifyTokenCache(): void {
  cachedToken = null;
}

async function fetchWithRateLimit(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike = fetch,
  attempt = 0
): Promise<Response> {
  const response = await fetchImpl(url, init);
  if (response.status === 429 && attempt < 2) {
    const retryHeader = response.headers.get('Retry-After');
    const retrySeconds = retryHeader ? Number(retryHeader) : 1;
    const waitMs = Math.min(5000, Math.max(250, (Number.isFinite(retrySeconds) ? retrySeconds : 1) * 1000));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return fetchWithRateLimit(url, init, fetchImpl, attempt + 1);
  }
  return response;
}

async function getSpotifyAccessToken(fetchImpl: FetchLike = fetch): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs - 60_000) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

  const res = await fetchWithRateLimit(
    'https://accounts.spotify.com/api/token',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    },
    fetchImpl
  );

  if (!res.ok) {
    throw new SpotifyApiError(res.status, `Spotify auth error (${res.status})`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new SpotifyApiError(502, 'Spotify token response missing access_token');
  }

  cachedToken = {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
  };

  return cachedToken.accessToken;
}

interface SpotifyTrackRaw {
  id: string;
  name: string;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  artists: Array<{ name: string }>;
  album?: { release_date?: string };
}

function parseReleaseYear(releaseDate?: string): number | undefined {
  if (!releaseDate) return undefined;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isInteger(year) && year > 1900 && year <= 2100 ? year : undefined;
}

function scoreStringMatch(expected: string, actual: string): number {
  const a = normalizeForMatch(expected);
  const b = normalizeForMatch(actual);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  return 0;
}

function scoreCandidate(
  targetTitle: string,
  targetArtist: string,
  track: SpotifyTrackRaw
): number {
  const titleScore = scoreStringMatch(targetTitle, track.name);
  const targetArtists = splitArtists(targetArtist);
  const actualArtists = track.artists.map((a) => a.name);

  let artistScore = 0;
  if (targetArtists.length > 0 && actualArtists.length > 0) {
    const matched = targetArtists.filter((ta) =>
      actualArtists.some((aa) => scoreStringMatch(ta, aa) >= 0.75)
    ).length;
    artistScore = matched / targetArtists.length;
  } else {
    artistScore = scoreStringMatch(targetArtist, actualArtists.join(' '));
  }

  return Number((titleScore * 0.65 + artistScore * 0.35).toFixed(3));
}

async function runSingleSpotifyQuery(
  accessToken: string,
  query: string,
  targetTitle: string,
  targetArtist: string,
  fetchImpl: FetchLike
): Promise<SpotifyCandidate[]> {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
  const res = await fetchWithRateLimit(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    fetchImpl
  );

  if (res.status === 401) {
    clearSpotifyTokenCache();
    throw new SpotifyApiError(401, 'Spotify token expired or unauthorized');
  }
  if (!res.ok) {
    throw new SpotifyApiError(res.status, `Spotify search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    tracks?: { items?: SpotifyTrackRaw[] };
  };
  const items = data.tracks?.items || [];

  return items
    .map((item) => {
      const artistStr = item.artists.map((a) => a.name).join(', ');
      const spotifyUrl =
        item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`;
      return {
        spotifyUrl,
        spotifyId: item.id,
        title: item.name,
        artist: artistStr,
        albumYear: parseReleaseYear(item.album?.release_date),
        previewAvailable: Boolean(item.preview_url),
        score: scoreCandidate(targetTitle, targetArtist, item),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

async function searchTrackWithFallback(
  accessToken: string,
  rawTitle: string,
  rawArtist: string,
  fetchImpl: FetchLike
): Promise<SpotifyCandidate[]> {
  const cleanedTitle = cleanOriginalText(cleanNonOriginalText(rawTitle) || rawTitle) || rawTitle;
  const primaryArtist = splitArtists(rawArtist)[0] || rawArtist;

  const strictQuery = `track:${cleanedTitle} artist:${primaryArtist}`;
  let candidates = await runSingleSpotifyQuery(
    accessToken,
    strictQuery,
    cleanedTitle,
    rawArtist,
    fetchImpl
  );

  if (candidates.length === 0 || candidates[0].score < 0.5) {
    const freeQuery = `${cleanedTitle} ${primaryArtist}`;
    const fallbackCandidates = await runSingleSpotifyQuery(
      accessToken,
      freeQuery,
      cleanedTitle,
      rawArtist,
      fetchImpl
    );
    const merged = new Map<string, SpotifyCandidate>();
    for (const c of [...candidates, ...fallbackCandidates]) {
      const prev = merged.get(c.spotifyId);
      if (!prev || c.score > prev.score) {
        merged.set(c.spotifyId, c);
      }
    }
    candidates = Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  return candidates;
}

export async function searchSpotifyTracks(
  queries: SpotifySearchQueryItem[],
  fetchImpl: FetchLike = fetch
): Promise<SpotifyBatchQueryResult[]> {
  const accessToken = await getSpotifyAccessToken(fetchImpl);
  const results: SpotifyBatchQueryResult[] = [];

  for (const item of queries) {
    const originals =
      item.originalTracks && item.originalTracks.length > 0
        ? item.originalTracks
        : [{ title: item.title, artist: item.artist }];

    const originalResults: SpotifyOriginalSearchResult[] = [];
    for (let idx = 0; idx < originals.length; idx += 1) {
      const orig = originals[idx];
      const candidates = await searchTrackWithFallback(
        accessToken,
        orig.title,
        orig.artist,
        fetchImpl
      );
      originalResults.push({
        index: idx,
        title: orig.title,
        artist: orig.artist,
        candidates,
      });
    }

    let playedVersionCandidates: SpotifyCandidate[] = [];
    if (item.playedLabel) {
      const cleanBase = cleanNonOriginalText(item.title) || item.title;
      const versionQuery = `${cleanBase} ${item.playedLabel} ${splitArtists(item.artist)[0] || item.artist}`;
      playedVersionCandidates = await runSingleSpotifyQuery(
        accessToken,
        versionQuery,
        item.title,
        item.artist,
        fetchImpl
      );
    }

    results.push({
      queryId: item.queryId,
      playedVersionCandidates,
      originalResults,
    });
  }

  return results;
}
