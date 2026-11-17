import React, { useState } from 'react';
import { TRACK_TYPES, type OriginalTrackRef, type TrackType, type TracklistEntry } from '../../../schemas/tracklist';
import {
  analyzeFormatting,
  normalizeArtistsForMatch,
  normalizeForMatch,
} from '../../../lib/rekordbox/trackNormalizer';
import type { SpotifyBatchQueryResult } from '../../../lib/spotify';

interface TrackRowEditorProps {
  track: TracklistEntry;
  totalRows: number;
  spotifyResult?: SpotifyBatchQueryResult;
  searchingSpotify?: boolean;
  onChange: (updated: TracklistEntry) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSearchSingleSpotify: () => void;
}

function optionalTrim(val: string): string | undefined {
  const t = val.trim();
  return t.length > 0 ? t : undefined;
}

export const TrackRowEditor: React.FC<TrackRowEditorProps> = ({
  track,
  totalRows,
  spotifyResult,
  searchingSpotify,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSearchSingleSpotify,
}) => {
  const [expanded, setExpanded] = useState(false);

  const anomalies = analyzeFormatting(
    track.title,
    track.artist,
    track.trackType === 'original'
  );
  const hasErrors = anomalies.some((a) => a.severity === 'error');
  const hasPreview = Boolean(
    track.playedVersion.spotifyUrl ||
      track.playedVersion.soundcloudUrl ||
      track.originalTracks.some((o) => o.spotifyUrl || o.soundcloudUrl)
  );

  function updateTitleOrArtist(nextTitle: string, nextArtist: string) {
    onChange({
      ...track,
      title: nextTitle,
      artist: nextArtist,
      syncMeta: {
        ...track.syncMeta,
        normalizedTitle: normalizeForMatch(nextTitle),
        normalizedArtists: normalizeArtistsForMatch(nextArtist),
      },
    });
  }

  function updateOriginalTrack(idx: number, patch: Partial<OriginalTrackRef>) {
    const next = [...track.originalTracks];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...track, originalTracks: next });
  }

  function addOriginalTrack() {
    onChange({
      ...track,
      originalTracks: [
        ...track.originalTracks,
        { title: track.title || 'Original Track', artist: track.artist || 'Artist' },
      ],
    });
  }

  function removeOriginalTrack(idx: number) {
    onChange({
      ...track,
      originalTracks: track.originalTracks.filter((_, i) => i !== idx),
    });
  }

  return (
    <div
      className={`rounded-2xl border transition-colors ${
        hasErrors
          ? 'bg-red-500/[0.06] border-red-500/35'
          : anomalies.length > 0
            ? 'bg-amber-500/[0.05] border-amber-500/30'
            : 'bg-white/[0.03] border-white/10'
      }`}
    >
      {/* Compact Row */}
      <div className="p-3 grid grid-cols-12 gap-2 items-center text-xs">
        <div className="col-span-1 flex items-center gap-1">
          <span className="font-mono text-gray-400 w-5 text-center">{track.index}</span>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={track.index <= 1}
              title="Sposta su"
              className="text-gray-400 hover:text-white disabled:opacity-25 leading-none p-0.5"
            >
              <i className="fas fa-caret-up text-[10px]" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={track.index >= totalRows}
              title="Sposta giù"
              className="text-gray-400 hover:text-white disabled:opacity-25 leading-none p-0.5"
            >
              <i className="fas fa-caret-down text-[10px]" />
            </button>
          </div>
        </div>

        <div className="col-span-3">
          <input
            type="text"
            value={track.title}
            onChange={(e) => updateTitleOrArtist(e.target.value, track.artist)}
            placeholder="Titolo traccia"
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-neonPurple focus:outline-none px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        <div className="col-span-2">
          <input
            type="text"
            value={track.artist}
            onChange={(e) => updateTitleOrArtist(track.title, e.target.value)}
            placeholder="Artista"
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-neonPurple focus:outline-none px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        <div className="col-span-2">
          <select
            value={track.trackType}
            onChange={(e) => onChange({ ...track, trackType: e.target.value as TrackType })}
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-neonPurple focus:outline-none px-2 py-1.5 text-xs text-white"
          >
            {TRACK_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-1">
          <input
            type="number"
            step="0.1"
            value={track.bpm ?? ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange({
                ...track,
                bpm: e.target.value && Number.isFinite(val) && val > 0 ? val : undefined,
              });
            }}
            placeholder="BPM"
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-neonPurple focus:outline-none px-2 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="col-span-1">
          <input
            type="text"
            value={track.key ?? ''}
            onChange={(e) => onChange({ ...track, key: optionalTrim(e.target.value) })}
            placeholder="Key"
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-neonPurple focus:outline-none px-2 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="col-span-2 flex items-center justify-end gap-1.5">
          {anomalies.length > 0 && (
            <span
              title={anomalies.map((a) => a.message).join(' | ')}
              className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                hasErrors
                  ? 'bg-red-500/20 text-red-200 border border-red-500/40'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              }`}
            >
              <i className="fas fa-triangle-exclamation mr-1" />
              {anomalies.length}
            </span>
          )}
          <span
            title={hasPreview ? 'Preview disponibile' : 'Nessun link preview'}
            className={`px-2 py-1 rounded-full text-[10px] border ${
              hasPreview
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                : 'bg-white/5 text-gray-500 border-white/10'
            }`}
          >
            <i className="fas fa-play text-[9px]" />
          </span>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            title="Dettagli, Originali, Tag & Preview"
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors ${
              expanded
                ? 'bg-neonPurple/25 border-neonPurple text-white'
                : 'bg-white/5 border-white/15 text-gray-300 hover:text-white'
            }`}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Rimuovi traccia"
            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/30 border border-red-500/25 text-red-300"
          >
            <i className="fas fa-trash-can text-[10px]" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/10 p-4 flex flex-col gap-4 bg-black/30 text-xs">
          {/* Anomalies Alert */}
          {anomalies.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex flex-col gap-1">
              <strong className="text-[11px] uppercase tracking-wider text-amber-300">
                Anomalie formattazione rilevate
              </strong>
              {anomalies.map((anom, idx) => (
                <div key={`${anom.code}-${idx}`} className="text-xs text-amber-100">
                  • {anom.message}
                </div>
              ))}
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Genere</label>
              <input
                type="text"
                value={track.genre ?? ''}
                onChange={(e) => onChange({ ...track, genre: optionalTrim(e.target.value) })}
                placeholder="Tech House"
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Label</label>
              <input
                type="text"
                value={track.label ?? ''}
                onChange={(e) => onChange({ ...track, label: optionalTrim(e.target.value) })}
                placeholder="Drumcode"
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Anno Uscita</label>
              <input
                type="number"
                value={track.releaseYear ?? ''}
                onChange={(e) => {
                  const yr = parseInt(e.target.value, 10);
                  onChange({
                    ...track,
                    releaseYear:
                      e.target.value && Number.isInteger(yr) && yr >= 1900 && yr <= 2100
                        ? yr
                        : undefined,
                  });
                }}
                placeholder="2026"
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Rating (0..5)</label>
              <select
                value={track.rating ?? ''}
                onChange={(e) =>
                  onChange({
                    ...track,
                    rating: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
              >
                <option value="">Nessuno</option>
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r} {'★'.repeat(r)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">
                My Tag (virgola)
              </label>
              <input
                type="text"
                value={track.myTags.join(', ')}
                onChange={(e) =>
                  onChange({
                    ...track,
                    myTags: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Peak Time, Vocal"
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Played Version Preview Links */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Versione Suonata (Edit / Remix / Mashup)
              </span>
              <button
                type="button"
                onClick={onSearchSingleSpotify}
                disabled={searchingSpotify}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold"
              >
                <i
                  className={`fab fa-spotify ${searchingSpotify ? 'fa-spin' : ''}`}
                />
                <span>{searchingSpotify ? 'Ricerca...' : 'Cerca su Spotify'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <input
                type="text"
                value={track.playedVersion.label ?? ''}
                onChange={(e) =>
                  onChange({
                    ...track,
                    playedVersion: {
                      ...track.playedVersion,
                      label: optionalTrim(e.target.value),
                    },
                  })
                }
                placeholder="Etichetta versione (es. PODA VIP Edit)"
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
              />
              <input
                type="url"
                value={track.playedVersion.spotifyUrl ?? ''}
                onChange={(e) =>
                  onChange({
                    ...track,
                    playedVersion: {
                      ...track.playedVersion,
                      spotifyUrl: optionalTrim(e.target.value),
                    },
                  })
                }
                placeholder="https://open.spotify.com/track/..."
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white font-mono text-[11px]"
              />
              <input
                type="url"
                value={track.playedVersion.soundcloudUrl ?? ''}
                onChange={(e) =>
                  onChange({
                    ...track,
                    playedVersion: {
                      ...track.playedVersion,
                      soundcloudUrl: optionalTrim(e.target.value),
                    },
                  })
                }
                placeholder="https://soundcloud.com/..."
                className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white font-mono text-[11px]"
              />
            </div>

            {spotifyResult && spotifyResult.playedVersionCandidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {spotifyResult.playedVersionCandidates.map((cand) => (
                  <button
                    key={cand.spotifyId}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...track,
                        playedVersion: {
                          ...track.playedVersion,
                          spotifyUrl: cand.spotifyUrl,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      track.playedVersion.spotifyUrl === cand.spotifyUrl
                        ? 'bg-emerald-500/25 border-emerald-400 text-white'
                        : 'bg-black/40 border-white/15 text-gray-300 hover:border-emerald-400/50'
                    }`}
                  >
                    <i className="fab fa-spotify text-emerald-400 mr-1" />
                    {cand.title} — {cand.artist} ({Math.round(cand.score * 100)}%)
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Original Tracks Components */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                Tracce Originali Componenti ({track.originalTracks.length})
              </span>
              <button
                type="button"
                onClick={addOriginalTrack}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-semibold"
              >
                <i className="fas fa-plus mr-1" />
                Aggiungi Originale
              </button>
            </div>

            {track.originalTracks.map((orig, oIdx) => {
              const origCands =
                spotifyResult?.originalResults.find((r) => r.index === oIdx)?.candidates || [];

              return (
                <div
                  key={oIdx}
                  className="rounded-xl bg-black/40 border border-white/10 p-2.5 flex flex-col gap-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={orig.title}
                      onChange={(e) => updateOriginalTrack(oIdx, { title: e.target.value })}
                      placeholder="Titolo originale"
                      className="col-span-3 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-white"
                    />
                    <input
                      type="text"
                      value={orig.artist}
                      onChange={(e) => updateOriginalTrack(oIdx, { artist: e.target.value })}
                      placeholder="Artista originale"
                      className="col-span-3 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-white"
                    />
                    <input
                      type="url"
                      value={orig.spotifyUrl ?? ''}
                      onChange={(e) =>
                        updateOriginalTrack(oIdx, { spotifyUrl: optionalTrim(e.target.value) })
                      }
                      placeholder="Spotify URL originale"
                      className="col-span-3 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-white font-mono text-[11px]"
                    />
                    <input
                      type="url"
                      value={orig.soundcloudUrl ?? ''}
                      onChange={(e) =>
                        updateOriginalTrack(oIdx, { soundcloudUrl: optionalTrim(e.target.value) })
                      }
                      placeholder="SoundCloud URL"
                      className="col-span-2 rounded-lg bg-black/50 border border-white/10 px-2 py-1 text-white font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeOriginalTrack(oIdx)}
                      title="Rimuovi traccia originale"
                      className="col-span-1 p-1 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-300"
                    >
                      <i className="fas fa-xmark text-xs" />
                    </button>
                  </div>

                  {origCands.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {origCands.map((cand) => (
                        <button
                          key={cand.spotifyId}
                          type="button"
                          onClick={() =>
                            updateOriginalTrack(oIdx, { spotifyUrl: cand.spotifyUrl })
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                            orig.spotifyUrl === cand.spotifyUrl
                              ? 'bg-emerald-500/25 border-emerald-400 text-white'
                              : 'bg-black/50 border-white/15 text-gray-300 hover:border-emerald-400/50'
                          }`}
                        >
                          <i className="fab fa-spotify text-emerald-400 mr-1" />
                          {cand.title} — {cand.artist}
                          {cand.albumYear ? ` (${cand.albumYear})` : ''} •{' '}
                          {Math.round(cand.score * 100)}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>
              syncMeta: title=&quot;{track.syncMeta.normalizedTitle}&quot; • artists=&quot;
              {track.syncMeta.normalizedArtists}&quot;
            </span>
            {track.syncMeta.filePathHash && (
              <span>hash: {track.syncMeta.filePathHash.slice(0, 12)}…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
