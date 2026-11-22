import React, { useState } from 'react';
import type { TracklistData } from '../../../schemas/tracklist';
import {
  parseRekordboxXml,
  runFullXmlAutoSync,
  type FullXmlAutoSyncResult,
} from '../../../lib/rekordbox';

interface FullXmlAutoSyncModalProps {
  existingTracklists: TracklistData[];
  onClose: () => void;
  onApplyAll: (payload: {
    updatedTracklists: Record<string, TracklistData>;
    importedNewHistories: TracklistData[];
  }) => void;
}

export const FullXmlAutoSyncModal: React.FC<FullXmlAutoSyncModalProps> = ({
  existingTracklists,
  onClose,
  onApplyAll,
}) => {
  const [xmlMeta, setXmlMeta] = useState<{ fileName: string; totalTracks: number } | null>(null);
  const [result, setResult] = useState<FullXmlAutoSyncResult | null>(null);
  const [selectedNewIds, setSelectedNewIds] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleXmlSelect(file: File | null) {
    if (!file) return;
    setError(null);
    setRunning(true);
    try {
      const text = await file.text();
      const parsed = parseRekordboxXml(text);
      const syncOut = await runFullXmlAutoSync(existingTracklists, parsed);
      setXmlMeta({ fileName: file.name, totalTracks: parsed.totalTracks });
      setResult(syncOut);

      const defaultSelected: Record<string, boolean> = {};
      for (const cand of syncOut.newHistories) {
        defaultSelected[cand.suggestedId] = true;
      }
      setSelectedNewIds(defaultSelected);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Errore analisi XML Rekordbox.');
    } finally {
      setRunning(false);
    }
  }

  function toggleNewHistory(id: string) {
    setSelectedNewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const chosenNewHistories = result
    ? result.newHistories
        .filter((h) => selectedNewIds[h.suggestedId])
        .map((h) => h.tracklist)
    : [];

  const updatedCount = result ? Object.keys(result.mergedUpdatedTracklists).length : 0;
  const totalToApply = updatedCount + chosenNewHistories.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-[#0a0a0c] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Carica XML Rekordbox (Auto-Sync Completo)
            </h2>
            <p className="text-[11px] text-gray-400">
              Sync tag globali + Events YYYY / HISTORIES
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
              onChange={(e) => void handleXmlSelect(e.target.files?.[0] || null)}
            />
            <i className="fas fa-wand-magic-sparkles text-2xl text-cyan-300 mb-2" />
            <span className="font-bold text-white">
              {xmlMeta
                ? `${xmlMeta.fileName} — ${xmlMeta.totalTracks} tracce in libreria`
                : 'Carica il file XML Rekordbox per eseguire Sync Globale Tag + Rilevamento Nuove History'}
            </span>
            <span className="text-[11px] text-gray-400 mt-1">
              Aggiorna Genre, My Tag, Rating, Label, BPM, Key e Anno su tutte le tracklist (incluse Demo manuali e file singoli) preservando i link Spotify/SoundCloud.
            </span>
          </label>

          {running && (
            <div className="py-6 text-center text-gray-300">
              <i className="fas fa-circle-notch fa-spin mr-2 text-cyan-300" />
              Analisi XML, doppio controllo hash SHA-256 e rilevamento HISTORIES...
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-3 text-red-200">
              {error}
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Tag Aggiornati</span>
                  <strong className="text-lg text-emerald-300 font-mono">
                    {result.tagSyncReport.tracksWithUpdates} tracce
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">History Aggiornate</span>
                  <strong className="text-lg text-cyan-300 font-mono">
                    {result.updatedHistories.length}
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Nuove History</span>
                  <strong className="text-lg text-neonPurple font-mono">
                    {result.newHistories.length}
                  </strong>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <span className="text-gray-400 block text-[10px] uppercase">Match Ambigui</span>
                  <strong className="text-lg text-amber-300 font-mono">
                    {result.tagSyncReport.ambiguousMatches}
                  </strong>
                </div>
              </div>

              {/* 1. New HISTORIES checklist */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neonPurple">
                    Nuove History rilevate ({result.newHistories.length})
                  </h3>
                  {result.newHistories.length > 0 && (
                    <span className="text-[11px] text-gray-400">
                      Selezionate: {chosenNewHistories.length} / {result.newHistories.length}
                    </span>
                  )}
                </div>

                {result.newHistories.length === 0 ? (
                  <p className="text-gray-400">
                    Nessuna nuova sessione in <code>Events YYYY/HISTORIES</code> non ancora presente nel workspace.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                    {result.newHistories.map((cand) => (
                      <label
                        key={cand.suggestedId}
                        className="rounded-xl bg-black/40 border border-white/10 p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-neonPurple/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedNewIds[cand.suggestedId])}
                            onChange={() => toggleNewHistory(cand.suggestedId)}
                            className="accent-neonPurple"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="text-white truncate">{cand.suggestedTitle}</strong>
                              {cand.historyScope && (
                                <span className="text-[10px] font-mono text-purple-300">
                                  ({cand.historyScope})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              <code>{cand.suggestedId}.json</code> • {cand.tracklist.tracks.length} tracce
                              {cand.recordedDate ? ` • ${cand.recordedDate}` : ''}
                            </div>
                          </div>
                        </div>

                        {cand.anomaliesCount > 0 && (
                          <span className="text-[11px] font-bold text-amber-300 flex-shrink-0">
                            {cand.anomaliesCount} anomalie
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Updated Histories & Tag Sync Diffs */}
              {(result.updatedHistories.length > 0 || result.tagSyncReport.tracksWithUpdates > 0) && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                    Riepilogo Aggiornamenti Tracklist Esistenti
                  </h3>

                  {result.updatedHistories.map((uh) => (
                    <div
                      key={uh.tracklistId}
                      className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 flex items-center justify-between"
                    >
                      <span className="text-white font-semibold">
                        History aggiornabile: {uh.title}
                      </span>
                      <span className="font-mono text-[11px] text-cyan-300">
                        {uh.previousCount} → {uh.nextCount} tracce
                      </span>
                    </div>
                  ))}

                  {result.tagSyncReport.items
                    .filter((i) => i.changes.length > 0)
                    .slice(0, 20)
                    .map((item) => (
                      <div
                        key={`${item.tracklistId}:${item.trackIndex}`}
                        className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 flex flex-col gap-1"
                      >
                        <div className="text-white font-medium">
                          <span className="text-gray-400 font-mono mr-1.5">
                            [{item.tracklistTitle} #{item.trackIndex}]
                          </span>
                          {item.title} — {item.artist}
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {item.changes.map((c) => (
                            <span
                              key={c.field}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/10"
                            >
                              <strong className="text-cyan-300">{c.field}:</strong> {c.before} →{' '}
                              <span className="text-emerald-300">{c.after}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/15 border border-white/10"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={!result || totalToApply === 0}
            onClick={() => {
              if (!result) return;
              onApplyAll({
                updatedTracklists: result.mergedUpdatedTracklists,
                importedNewHistories: chosenNewHistories,
              });
            }}
            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-black bg-cyan-300 hover:bg-cyan-200 disabled:opacity-45"
          >
            Applica Tutto al Workspace ({totalToApply} file)
          </button>
        </div>
      </div>
    </div>
  );
};
