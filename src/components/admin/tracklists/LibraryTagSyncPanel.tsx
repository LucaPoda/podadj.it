import React, { useState } from 'react';
import type { TracklistData } from '../../../schemas/tracklist';
import {
  applySelectedCandidateToEntry,
  parseRekordboxXml,
  syncTracklistsWithXml,
  type ParsedRekordboxXml,
  type SyncReport,
} from '../../../lib/rekordbox';
import { hashFilePath } from '../../../lib/rekordbox/trackNormalizer';

interface LibraryTagSyncPanelProps {
  tracklists: TracklistData[];
  onClose: () => void;
  onApplySynced: (updatedTracklists: Record<string, TracklistData>) => void;
}

export const LibraryTagSyncPanel: React.FC<LibraryTagSyncPanelProps> = ({
  tracklists,
  onClose,
  onApplySynced,
}) => {
  const [parsedXml, setParsedXml] = useState<ParsedRekordboxXml | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [workingUpdates, setWorkingUpdates] = useState<Record<string, TracklistData>>({});
  const [manualResolved, setManualResolved] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleXmlUpload(file: File | null) {
    if (!file) return;
    setError(null);
    setRunning(true);
    try {
      const text = await file.text();
      const parsed = parseRekordboxXml(text);
      setParsedXml(parsed);
      const syncResult = await syncTracklistsWithXml(tracklists, parsed);
      setReport(syncResult);
      setWorkingUpdates(syncResult.updatedTracklists);
      setManualResolved({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore analisi XML.');
    } finally {
      setRunning(false);
    }
  }

  async function handlePickAmbiguous(
    tracklistId: string,
    trackIndex: number,
    selectedTrackId: string
  ) {
    if (!parsedXml) return;
    const raw = parsedXml.tracksById[selectedTrackId];
    if (!raw) return;

    const baseTl =
      workingUpdates[tracklistId] || tracklists.find((t) => t.id === tracklistId);
    if (!baseTl) return;

    const filePathHash = await hashFilePath(raw.location);
    const nextTracks = baseTl.tracks.map((entry) => {
      if (entry.index !== trackIndex) return entry;
      return applySelectedCandidateToEntry(entry, raw, filePathHash).updated;
    });

    setWorkingUpdates((prev) => ({
      ...prev,
      [tracklistId]: {
        ...baseTl,
        updatedAt: new Date().toISOString(),
        tracks: nextTracks,
      },
    }));
    setManualResolved((prev) => ({
      ...prev,
      [`${tracklistId}:${trackIndex}`]: selectedTrackId,
    }));
  }

  const changedTracklistsCount = Object.keys(workingUpdates).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#0a0a0c] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Sync Globale Tag Libreria ({tracklists.length} Tracklist)
            </h2>
            <p className="text-[11px] text-gray-400">
              Doppio controllo hash SHA-256 + titolo/artisti
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 flex items-center justify-center"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          <label className="rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-400/60 bg-white/[0.02] p-5 flex flex-col items-center text-center cursor-pointer">
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => void handleXmlUpload(e.target.files?.[0] || null)}
            />
            <i className="fas fa-arrows-rotate text-2xl text-cyan-300 mb-2" />
            <span className="font-bold text-white">
              Carica l&apos;ultimo XML Rekordbox per sincronizzare Genre, My Tag, Rating, Label, BPM, Key e Anno
            </span>
            <span className="text-[11px] text-gray-400 mt-1">
              I link Spotify e SoundCloud già salvati vengono sempre preservati intatti.
            </span>
          </label>

          {running && (
            <div className="py-6 text-center text-gray-300">
              <i className="fas fa-circle-notch fa-spin mr-2 text-cyan-300" />
              Confronto librerie in corso...
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-3 text-red-200">
              {error}
            </div>
          )}

          {report && (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Match Sicuri</span>
                  <strong className="text-lg text-emerald-300 font-mono">
                    {report.exactMatches}
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Da Confermare</span>
                  <strong className="text-lg text-amber-300 font-mono">
                    {report.ambiguousMatches}
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Non Trovate</span>
                  <strong className="text-lg text-gray-400 font-mono">
                    {report.unmatchedTracks}
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Tracce Aggiornate</span>
                  <strong className="text-lg text-cyan-300 font-mono">
                    {report.tracksWithUpdates}
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {report.items
                  .filter((it) => it.changes.length > 0 || it.confidence !== 'exact')
                  .map((item) => {
                    const key = `${item.tracklistId}:${item.trackIndex}`;
                    return (
                      <div
                        key={key}
                        className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-gray-400 mr-2">
                              [{item.tracklistTitle} #{item.trackIndex}]
                            </span>
                            <strong className="text-white">
                              {item.title} — {item.artist}
                            </strong>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              item.confidence === 'exact'
                                ? 'text-emerald-300'
                                : item.confidence === 'ambiguous'
                                  ? 'text-amber-300'
                                  : 'text-gray-400'
                            }`}
                          >
                            {item.confidence}
                            {item.matchedBy ? ` (${item.matchedBy})` : ''}
                          </span>
                        </div>

                        {item.changes.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {item.changes.map((c) => (
                              <span
                                key={c.field}
                                className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-gray-200"
                              >
                                <strong className="text-cyan-300">{c.field}:</strong> {c.before} →{' '}
                                <span className="text-emerald-300">{c.after}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {item.confidence === 'ambiguous' && item.candidates && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.candidates.map((cand) => (
                              <button
                                key={cand.trackId}
                                type="button"
                                onClick={() =>
                                  void handlePickAmbiguous(
                                    item.tracklistId,
                                    item.trackIndex,
                                    cand.trackId
                                  )
                                }
                                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                                  manualResolved[key] === cand.trackId
                                    ? 'bg-cyan-500/25 border-cyan-400 text-white'
                                    : 'bg-black/40 border-white/15 text-gray-300'
                                }`}
                              >
                                ID {cand.trackId}: {cand.title} — {cand.artist} ({cand.genre || '—'})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/15 border border-white/10"
          >
            Chiudi
          </button>
          <button
            type="button"
            disabled={!report || changedTracklistsCount === 0}
            onClick={() => onApplySynced(workingUpdates)}
            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-cyan-300 hover:bg-cyan-200 disabled:opacity-45"
          >
            Applica Aggiornamenti ({changedTracklistsCount} Tracklist)
          </button>
        </div>
      </div>
    </div>
  );
};
