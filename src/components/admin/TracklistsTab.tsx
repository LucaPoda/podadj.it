import React, { useMemo, useState } from 'react';
import type {
  TracklistData,
  TracklistEntry,
  TracklistSourceType,
} from '../../schemas/tracklist';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import {
  normalizeArtistsForMatch,
  normalizeForMatch,
} from '../../lib/rekordbox/trackNormalizer';
import type { SpotifyBatchQueryResult } from '../../lib/spotify';
import { TrackRowEditor } from './tracklists/TrackRowEditor';
import { RekordboxImportWizard } from './tracklists/RekordboxImportWizard';
import { LibraryTagSyncPanel } from './tracklists/LibraryTagSyncPanel';

const TRACKLIST_PREFIX = 'src/content/tracklists/';

function toTracklistPath(id: string): string {
  return `${TRACKLIST_PREFIX}${id}.json`;
}

function slugify(val: string): string {
  const s = val
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || `tracklist-${Date.now()}`;
}

export const TracklistsTab: React.FC = () => {
  const { workingSnapshot, updateContentFile, deleteContentFile } = useAdminWorkspace();

  const tracklistsMap = useMemo(() => {
    const out: Record<string, TracklistData> = {};
    for (const [filePath, data] of Object.entries(workingSnapshot)) {
      if (filePath.startsWith(TRACKLIST_PREFIX) && filePath.endsWith('.json') && data) {
        const tl = data as TracklistData;
        out[filePath] = tl;
      }
    }
    return out;
  }, [workingSnapshot]);

  const sortedPaths = useMemo(
    () =>
      Object.keys(tracklistsMap).sort((a, b) =>
        (tracklistsMap[b].updatedAt || '').localeCompare(tracklistsMap[a].updatedAt || '')
      ),
    [tracklistsMap]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  const [spotifyResults, setSpotifyResults] = useState<Record<string, SpotifyBatchQueryResult>>({});
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState<string | null>(null);
  const [renameIdInput, setRenameIdInput] = useState('');

  const activePath =
    selectedPath && tracklistsMap[selectedPath] ? selectedPath : sortedPaths[0] ?? null;
  const activeTracklist = activePath ? tracklistsMap[activePath] : null;

  function saveTracklistToWorkspace(next: TracklistData, previousPath?: string) {
    const nextPath = toTracklistPath(next.id);
    if (previousPath && previousPath !== nextPath) {
      deleteContentFile(previousPath);
    }
    updateContentFile(nextPath, {
      ...next,
      updatedAt: new Date().toISOString(),
    });
    setSelectedPath(nextPath);
  }

  function handleCreateManual() {
    const baseId = `manual-${new Date().toISOString().slice(0, 10)}`;
    let candidate = baseId;
    let counter = 2;
    while (tracklistsMap[toTracklistPath(candidate)]) {
      candidate = `${baseId}-${counter}`;
      counter += 1;
    }

    const created: TracklistData = {
      id: candidate,
      title: `Nuova Tracklist (${candidate})`,
      sourceType: 'manual',
      sourceName: 'Inserimento Manuale',
      recordedDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      tracks: [
        {
          index: 1,
          title: 'Nuova Traccia',
          artist: 'Artista',
          trackType: 'original',
          playedVersion: {},
          originalTracks: [{ title: 'Nuova Traccia', artist: 'Artista' }],
          myTags: [],
          syncMeta: {
            normalizedTitle: normalizeForMatch('Nuova Traccia'),
            normalizedArtists: normalizeArtistsForMatch('Artista'),
          },
        },
      ],
    };

    saveTracklistToWorkspace(created);
  }

  function handleDuplicate() {
    if (!activeTracklist) return;
    let candidate = `${activeTracklist.id}-copy`;
    let counter = 2;
    while (tracklistsMap[toTracklistPath(candidate)]) {
      candidate = `${activeTracklist.id}-copy-${counter}`;
      counter += 1;
    }

    saveTracklistToWorkspace({
      ...JSON.parse(JSON.stringify(activeTracklist)),
      id: candidate,
      title: `${activeTracklist.title} (Copia)`,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDeleteActive() {
    if (!activePath) return;
    deleteContentFile(activePath);
    setSelectedPath(null);
  }

  function handleRenameId() {
    if (!activeTracklist || !activePath) return;
    const nextId = slugify(renameIdInput);
    if (!nextId || nextId === activeTracklist.id) return;
    if (tracklistsMap[toTracklistPath(nextId)]) {
      setSpotifyMessage(`Esiste già una tracklist con ID "${nextId}".`);
      return;
    }
    saveTracklistToWorkspace({ ...activeTracklist, id: nextId }, activePath);
    setRenameIdInput('');
  }

  function reindexTracks(tracks: TracklistEntry[]): TracklistEntry[] {
    return tracks.map((t, i) => ({ ...t, index: i + 1 }));
  }

  function handleUpdateTrack(idx: number, updated: TracklistEntry) {
    if (!activeTracklist || !activePath) return;
    const nextTracks = [...activeTracklist.tracks];
    nextTracks[idx] = updated;
    saveTracklistToWorkspace({ ...activeTracklist, tracks: nextTracks }, activePath);
  }

  function handleMoveTrack(idx: number, direction: -1 | 1) {
    if (!activeTracklist || !activePath) return;
    const target = idx + direction;
    if (target < 0 || target >= activeTracklist.tracks.length) return;
    const nextTracks = [...activeTracklist.tracks];
    const [moved] = nextTracks.splice(idx, 1);
    nextTracks.splice(target, 0, moved);
    saveTracklistToWorkspace(
      { ...activeTracklist, tracks: reindexTracks(nextTracks) },
      activePath
    );
  }

  function handleDeleteTrack(idx: number) {
    if (!activeTracklist || !activePath) return;
    const nextTracks = activeTracklist.tracks.filter((_, i) => i !== idx);
    saveTracklistToWorkspace(
      { ...activeTracklist, tracks: reindexTracks(nextTracks) },
      activePath
    );
  }

  function handleAddTrack() {
    if (!activeTracklist || !activePath) return;
    const nextIndex = activeTracklist.tracks.length + 1;
    const added: TracklistEntry = {
      index: nextIndex,
      title: 'Nuova Traccia',
      artist: 'Artista',
      trackType: 'original',
      playedVersion: {},
      originalTracks: [{ title: 'Nuova Traccia', artist: 'Artista' }],
      myTags: [],
      syncMeta: {
        normalizedTitle: normalizeForMatch('Nuova Traccia'),
        normalizedArtists: normalizeArtistsForMatch('Artista'),
      },
    };
    saveTracklistToWorkspace(
      { ...activeTracklist, tracks: [...activeTracklist.tracks, added] },
      activePath
    );
  }

  async function searchSpotifyForTracks(indices?: number[]) {
    if (!activeTracklist || !activePath) return;
    const targetTracks = indices
      ? activeTracklist.tracks.filter((_, idx) => indices.includes(idx))
      : activeTracklist.tracks;

    if (targetTracks.length === 0) return;

    setSpotifySearching(true);
    setSpotifyMessage(null);

    try {
      const chunkSize = 15;
      const mergedResults: Record<string, SpotifyBatchQueryResult> = { ...spotifyResults };
      let autoMatchedCount = 0;
      const nextTracks = [...activeTracklist.tracks];

      for (let i = 0; i < targetTracks.length; i += chunkSize) {
        const chunk = targetTracks.slice(i, i + chunkSize);
        const queries = chunk.map((t) => ({
          queryId: `${activeTracklist.id}:${t.index}`,
          title: t.title,
          artist: t.artist,
          ...(t.trackType !== 'original' && t.playedVersion.label
            ? { playedLabel: t.playedVersion.label }
            : {}),
          originalTracks:
            t.originalTracks.length > 0
              ? t.originalTracks.map((o) => ({ title: o.title, artist: o.artist }))
              : [{ title: t.title, artist: t.artist }],
        }));

        const res = await fetch('/api/admin/spotify/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries }),
        });

        const payload = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          results?: SpotifyBatchQueryResult[];
          error?: string;
        };

        if (!res.ok || !payload.ok || !payload.results) {
          throw new Error(payload.error || 'Errore nella ricerca Spotify.');
        }

        for (const qRes of payload.results) {
          mergedResults[qRes.queryId] = qRes;

          const rowIdx = nextTracks.findIndex(
            (t) => `${activeTracklist.id}:${t.index}` === qRes.queryId
          );
          if (rowIdx === -1) continue;

          const row = nextTracks[rowIdx];
          let updatedRow = { ...row };
          let rowTouched = false;

          // Auto-fill high-confidence original track URLs if not already set
          if (qRes.originalResults.length > 0) {
            const nextOriginals = [...updatedRow.originalTracks];
            for (const oRes of qRes.originalResults) {
              const best = oRes.candidates[0];
              if (best && best.score >= 0.72 && nextOriginals[oRes.index] && !nextOriginals[oRes.index].spotifyUrl) {
                nextOriginals[oRes.index] = {
                  ...nextOriginals[oRes.index],
                  spotifyUrl: best.spotifyUrl,
                };
                rowTouched = true;
                autoMatchedCount += 1;
              }
            }
            updatedRow.originalTracks = nextOriginals;
          }

          // Auto-fill high-confidence playedVersion URL if non-original and empty
          if (
            updatedRow.trackType !== 'original' &&
            !updatedRow.playedVersion.spotifyUrl &&
            qRes.playedVersionCandidates[0] &&
            qRes.playedVersionCandidates[0].score >= 0.8
          ) {
            updatedRow.playedVersion = {
              ...updatedRow.playedVersion,
              spotifyUrl: qRes.playedVersionCandidates[0].spotifyUrl,
            };
            rowTouched = true;
          }

          if (rowTouched) {
            nextTracks[rowIdx] = updatedRow;
          }
        }
      }

      setSpotifyResults(mergedResults);
      saveTracklistToWorkspace({ ...activeTracklist, tracks: nextTracks }, activePath);
      setSpotifyMessage(
        `Ricerca Spotify completata: ${autoMatchedCount} link assegnati automaticamente. Apri le singole righe per verificare o scegliere candidati alternativi.`
      );
    } catch (err) {
      setSpotifyMessage(err instanceof Error ? err.message : 'Ricerca Spotify fallita.');
    } finally {
      setSpotifySearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Action Toolbar */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neonPurple/15 text-purple-300 border border-neonPurple/35 mb-1">
            Fase 3 • Gestione Archivio &amp; Rekordbox XML
          </span>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            Tracklists ({sortedPaths.length})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-neonPurple hover:bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.35)]"
          >
            <i className="fas fa-file-import text-[11px]" />
            <span>Importa XML Rekordbox</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSyncPanel(true)}
            disabled={sortedPaths.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 disabled:opacity-45 text-cyan-200"
          >
            <i className="fas fa-arrows-rotate text-[11px]" />
            <span>Sync Globale Tag Libreria</span>
          </button>

          <button
            type="button"
            onClick={handleCreateManual}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/15 text-white"
          >
            <i className="fas fa-plus text-[11px]" />
            <span>Nuova Manuale</span>
          </button>
        </div>
      </section>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left Archive Sidebar */}
        <aside className="col-span-3 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-4 shadow-xl flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">
            Tracklist nel Workspace
          </span>

          {sortedPaths.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/15 p-4 text-center text-xs text-gray-400">
              Nessuna tracklist salvata. Importa un XML Rekordbox o creane una manuale.
            </div>
          ) : (
            sortedPaths.map((p) => {
              const tl = tracklistsMap[p];
              const isSelected = p === activePath;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPath(p);
                    setRenameIdInput('');
                  }}
                  className={`w-full text-left rounded-2xl p-3 border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-neonPurple/20 border-neonPurple/60 text-white'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate">{tl.title}</span>
                    <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                      {tl.tracks.length} tr
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400">
                    <code className="truncate">{tl.id}</code>
                    <span className="uppercase">{tl.sourceType}</span>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Right Editor Canvas */}
        <section className="col-span-9 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 shadow-xl flex flex-col gap-4">
          {!activeTracklist || !activePath ? (
            <div className="py-16 text-center text-xs text-gray-400">
              Seleziona o crea una tracklist per iniziare la modifica.
            </div>
          ) : (
            <>
              {/* Metadata Header */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-[11px] text-purple-300 font-mono">{activePath}</code>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 border border-white/15 text-gray-200"
                    >
                      <i className="fas fa-copy mr-1" />
                      Duplica
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteActive}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-200"
                    >
                      <i className="fas fa-trash-can mr-1" />
                      Elimina
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 text-xs">
                  <div className="col-span-4">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Titolo Tracklist
                    </label>
                    <input
                      type="text"
                      value={activeTracklist.title}
                      onChange={(e) =>
                        saveTracklistToWorkspace(
                          { ...activeTracklist, title: e.target.value },
                          activePath
                        )
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Sorgente
                    </label>
                    <select
                      value={activeTracklist.sourceType}
                      onChange={(e) =>
                        saveTracklistToWorkspace(
                          {
                            ...activeTracklist,
                            sourceType: e.target.value as TracklistSourceType,
                          },
                          activePath
                        )
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    >
                      <option value="history">history</option>
                      <option value="playlist">playlist</option>
                      <option value="manual">manual</option>
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Nome Sorgente
                    </label>
                    <input
                      type="text"
                      value={activeTracklist.sourceName}
                      onChange={(e) =>
                        saveTracklistToWorkspace(
                          { ...activeTracklist, sourceName: e.target.value },
                          activePath
                        )
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={activeTracklist.recordedDate ?? ''}
                      onChange={(e) =>
                        saveTracklistToWorkspace(
                          {
                            ...activeTracklist,
                            recordedDate: e.target.value || undefined,
                          },
                          activePath
                        )
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Rename ID row */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-xs">
                  <span className="text-[11px] text-gray-400">Rinomina slug ID:</span>
                  <input
                    type="text"
                    value={renameIdInput}
                    onChange={(e) => setRenameIdInput(e.target.value)}
                    placeholder={activeTracklist.id}
                    className="rounded-xl bg-black/50 border border-white/10 px-2.5 py-1 text-white font-mono text-[11px] w-56"
                  />
                  <button
                    type="button"
                    onClick={handleRenameId}
                    disabled={!renameIdInput.trim()}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-[11px] font-semibold"
                  >
                    Rinomina
                  </button>
                </div>
              </div>

              {/* Spotify Batch & Track Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={spotifySearching || activeTracklist.tracks.length === 0}
                    onClick={() => void searchSpotifyForTracks()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-45 text-emerald-200"
                  >
                    <i className={`fab fa-spotify ${spotifySearching ? 'fa-spin' : ''}`} />
                    <span>
                      {spotifySearching
                        ? 'Ricerca Spotify in corso...'
                        : 'Cerca Preview su Spotify'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddTrack}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-white"
                  >
                    <i className="fas fa-plus text-[10px]" />
                    <span>Aggiungi Traccia</span>
                  </button>
                </div>

                <span className="text-xs text-gray-400">
                  {activeTracklist.tracks.length} tracce totali
                </span>
              </div>

              {spotifyMessage && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/35 px-4 py-2.5 text-xs text-emerald-100">
                  {spotifyMessage}
                </div>
              )}

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Titolo</div>
                <div className="col-span-2">Artista</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-1">BPM</div>
                <div className="col-span-1">Key</div>
                <div className="col-span-2 text-right">Stato / Azioni</div>
              </div>

              {/* Editable Track Rows */}
              <div className="flex flex-col gap-2">
                {activeTracklist.tracks.map((track, idx) => (
                  <TrackRowEditor
                    key={`${activeTracklist.id}-${track.index}-${idx}`}
                    track={track}
                    totalRows={activeTracklist.tracks.length}
                    spotifyResult={spotifyResults[`${activeTracklist.id}:${track.index}`]}
                    searchingSpotify={spotifySearching}
                    onChange={(updated) => handleUpdateTrack(idx, updated)}
                    onMoveUp={() => handleMoveTrack(idx, -1)}
                    onMoveDown={() => handleMoveTrack(idx, 1)}
                    onDelete={() => handleDeleteTrack(idx)}
                    onSearchSingleSpotify={() => void searchSpotifyForTracks([idx])}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {showImportWizard && (
        <RekordboxImportWizard
          onClose={() => setShowImportWizard(false)}
          onImport={(imported) => {
            saveTracklistToWorkspace(imported);
            setShowImportWizard(false);
          }}
        />
      )}

      {showSyncPanel && (
        <LibraryTagSyncPanel
          tracklists={sortedPaths.map((p) => tracklistsMap[p])}
          onClose={() => setShowSyncPanel(false)}
          onApplySynced={(updatedMap: Record<string, TracklistData>) => {
            for (const tl of Object.values(updatedMap)) {
              updateContentFile(toTracklistPath(tl.id), tl);
            }
            setShowSyncPanel(false);
          }}
        />
      )}
    </div>
  );
};
