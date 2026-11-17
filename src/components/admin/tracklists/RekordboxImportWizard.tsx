import React, { useMemo, useState } from 'react';
import type { TracklistData, TracklistEntry } from '../../../schemas/tracklist';
import {
  analyzeFormatting,
  buildTracklistEntryFromRaw,
  parseRekordboxXml,
  type ParsedRekordboxXml,
  type RekordboxPlaylistNode,
} from '../../../lib/rekordbox';

interface RekordboxImportWizardProps {
  onClose: () => void;
  onImport: (tracklist: TracklistData) => void;
}

function slugifyId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || `tracklist-${Date.now()}`;
}

export const RekordboxImportWizard: React.FC<RekordboxImportWizardProps> = ({
  onClose,
  onImport,
}) => {
  const [xmlInfo, setXmlInfo] = useState<{ fileName: string; sizeMb: string } | null>(null);
  const [parsedXml, setParsedXml] = useState<ParsedRekordboxXml | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<RekordboxPlaylistNode | null>(null);
  const [previewEntries, setPreviewEntries] = useState<TracklistEntry[]>([]);
  const [buildingPreview, setBuildingPreview] = useState(false);

  const [targetId, setTargetId] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [recordedDate, setRecordedDate] = useState('');

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    setParseError(null);
    setSelectedPlaylist(null);
    setPreviewEntries([]);

    try {
      const text = await file.text();
      const parsed = parseRekordboxXml(text);
      setParsedXml(parsed);
      setXmlInfo({
        fileName: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
      });
    } catch (err) {
      setParsedXml(null);
      setParseError(err instanceof Error ? err.message : 'Errore parsing XML Rekordbox.');
    }
  }

  async function selectNode(node: RekordboxPlaylistNode) {
    if (!parsedXml || node.type !== 'playlist') return;
    setSelectedPlaylist(node);
    setTargetTitle(node.name);
    setTargetId(slugifyId(node.name));
    const dateMatch = node.name.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    setRecordedDate(dateMatch ? dateMatch[1] : '');

    setBuildingPreview(true);
    try {
      const entries: TracklistEntry[] = [];
      let idx = 1;
      for (const tid of node.trackIds) {
        const raw = parsedXml.tracksById[tid];
        if (!raw) continue;
        const entry = await buildTracklistEntryFromRaw(raw, idx);
        entries.push(entry);
        idx += 1;
      }
      setPreviewEntries(entries);
    } finally {
      setBuildingPreview(false);
    }
  }

  const anomalySummary = useMemo(() => {
    let total = 0;
    for (const entry of previewEntries) {
      total += analyzeFormatting(
        entry.title,
        entry.artist,
        entry.trackType === 'original'
      ).length;
    }
    return total;
  }, [previewEntries]);

  function handleConfirmImport() {
    if (!selectedPlaylist || previewEntries.length === 0) return;
    const tracklist: TracklistData = {
      id: slugifyId(targetId || selectedPlaylist.name),
      title: targetTitle.trim() || selectedPlaylist.name,
      sourceType: selectedPlaylist.isHistory ? 'history' : 'playlist',
      sourceName: selectedPlaylist.name,
      ...(recordedDate && /^\d{4}-\d{2}-\d{2}$/.test(recordedDate) ? { recordedDate } : {}),
      updatedAt: new Date().toISOString(),
      tracks: previewEntries,
    };
    onImport(tracklist);
  }

  function renderPlaylistTree(nodes: RekordboxPlaylistNode[], depth = 0) {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }} className="flex flex-col gap-1">
        {node.type === 'folder' ? (
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-1 flex items-center gap-1.5">
            <i
              className={`fas ${
                node.isHistory ? 'fa-clock-rotate-left text-neonPurple' : 'fa-folder text-gray-500'
              } text-[10px]`}
            />
            <span>{node.name}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void selectNode(node)}
            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
              selectedPlaylist?.path === node.path
                ? 'bg-neonPurple/25 border border-neonPurple/60 text-white'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border border-transparent text-gray-300'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <i
                className={`fas ${
                  node.isHistory ? 'fa-clock-rotate-left text-neonPurple' : 'fa-list-ul text-gray-400'
                } text-[10px]`}
              />
              <span className="truncate">{node.name}</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
              {node.trackIds.length}
            </span>
          </button>
        )}
        {node.children.length > 0 && renderPlaylistTree(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-[#0a0a0c] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neonPurple/20 text-purple-300 border border-neonPurple/35 mb-1">
              Parsing 100% Locale nel Browser
            </span>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Importa Tracklist da XML Rekordbox
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 flex items-center justify-center"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* File Upload Zone */}
          <label className="rounded-2xl border-2 border-dashed border-white/20 hover:border-neonPurple/60 bg-white/[0.02] p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => void handleFileSelect(e.target.files?.[0] || null)}
            />
            <i className="fas fa-file-code text-2xl text-neonPurple mb-2" />
            <span className="text-xs font-bold text-white">
              {xmlInfo
                ? `${xmlInfo.fileName} (${xmlInfo.sizeMb} MB) — ${parsedXml?.totalTracks ?? 0} tracce in libreria`
                : 'Seleziona o trascina il file rekordbox.xml dal tuo computer'}
            </span>
            <span className="text-[11px] text-gray-400 mt-1">
              L&apos;XML non viene mai caricato sul server: i path locali vengono convertiti in hash SHA-256 e `Comments` è ignorato.
            </span>
          </label>

          {parseError && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-3.5 text-xs text-red-200">
              {parseError}
            </div>
          )}

          {parsedXml && (
            <div className="grid grid-cols-12 gap-4 min-h-[320px]">
              {/* Left: HISTORIES & Playlist Navigator */}
              <div className="col-span-4 rounded-2xl bg-white/[0.03] border border-white/10 p-3 overflow-y-auto max-h-[420px] flex flex-col gap-3">
                {parsedXml.historyNodes.length > 0 && (
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-neonPurple mb-1.5">
                      Accesso Rapido HISTORIES ({parsedXml.historyNodes.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {parsedXml.historyNodes.map((h) => (
                        <button
                          key={h.path}
                          type="button"
                          onClick={() => void selectNode(h)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 ${
                            selectedPlaylist?.path === h.path
                              ? 'bg-neonPurple/25 border border-neonPurple/60 text-white'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-200'
                          }`}
                        >
                          <span className="truncate">{h.name}</span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {h.trackIds.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">
                    Albero Completo Playlist
                  </div>
                  {renderPlaylistTree(parsedXml.playlists)}
                </div>
              </div>

              {/* Right: Preview & Metadata */}
              <div className="col-span-8 rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                {!selectedPlaylist ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                    Seleziona una sessione History o Playlist a sinistra per visualizzare l&apos;anteprima.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Slug ID File JSON
                        </label>
                        <input
                          type="text"
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value)}
                          className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Titolo Tracklist
                        </label>
                        <input
                          type="text"
                          value={targetTitle}
                          onChange={(e) => setTargetTitle(e.target.value)}
                          className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Data (YYYY-MM-DD)
                        </label>
                        <input
                          type="date"
                          value={recordedDate}
                          onChange={(e) => setRecordedDate(e.target.value)}
                          className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    {anomalySummary > 0 && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-200 flex items-center gap-2">
                        <i className="fas fa-triangle-exclamation text-amber-400" />
                        <span>
                          Rilevate <strong>{anomalySummary}</strong> anomalie di formattazione: puoi importare ora e correggerle nella tabella editabile, oppure sistemarle in Rekordbox e ricaricare l&apos;XML.
                        </span>
                      </div>
                    )}

                    {buildingPreview ? (
                      <div className="py-6 text-center text-xs text-gray-400">
                        <i className="fas fa-circle-notch fa-spin mr-2 text-neonPurple" />
                        Decomposizione tracce e calcolo hash SHA-256...
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {previewEntries.map((entry) => {
                          const rowAnoms = analyzeFormatting(
                            entry.title,
                            entry.artist,
                            entry.trackType === 'original'
                          );
                          return (
                            <div
                              key={entry.index}
                              className={`rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 border ${
                                rowAnoms.length > 0
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-black/40 border-white/5'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-gray-400 text-[11px]">
                                    #{entry.index}
                                  </span>
                                  <span className="font-semibold text-white truncate">
                                    {entry.title}
                                  </span>
                                  {entry.trackType !== 'original' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-neonPurple/20 text-purple-300 border border-neonPurple/35">
                                      {entry.trackType}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 truncate">
                                  {entry.artist}
                                  {entry.originalTracks.length > 1 && (
                                    <span className="text-purple-300 ml-2">
                                      ({entry.originalTracks.length} originali)
                                    </span>
                                  )}
                                </div>
                                {rowAnoms.length > 0 && (
                                  <div className="text-[10px] text-amber-300 mt-0.5">
                                    {rowAnoms.map((a) => a.message).join(' • ')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-[11px] font-mono text-gray-400 flex-shrink-0">
                                {entry.bpm ? `${entry.bpm} BPM` : ''} {entry.key || ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
            disabled={!selectedPlaylist || previewEntries.length === 0 || buildingPreview}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-neonPurple hover:bg-purple-500 disabled:opacity-45"
          >
            Importa {previewEntries.length} Tracce nel Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
