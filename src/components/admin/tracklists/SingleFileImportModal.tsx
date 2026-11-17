import React, { useState } from 'react';
import type { TracklistData } from '../../../schemas/tracklist';
import {
  decodeRekordboxTextFile,
  parseRekordboxDelimitedText,
  type DelimitedParseResult,
} from '../../../lib/rekordbox';

interface SingleFileImportModalProps {
  onClose: () => void;
  onImport: (tracklist: TracklistData) => void;
}

function slugify(val: string): string {
  const s = val
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || `rekordbox-file-${Date.now()}`;
}

export const SingleFileImportModal: React.FC<SingleFileImportModalProps> = ({
  onClose,
  onImport,
}) => {
  const [rawText, setRawText] = useState('');
  const [sourceFileName, setSourceFileName] = useState('');
  const [includeColorTag, setIncludeColorTag] = useState(true);
  const [parseResult, setParseResult] = useState<DelimitedParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const [targetId, setTargetId] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [recordedDate, setRecordedDate] = useState('');

  async function runParse(textToParse: string, colorFlag: boolean, fileNameHint?: string) {
    if (!textToParse.trim()) {
      setParseResult(null);
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const res = await parseRekordboxDelimitedText(textToParse, {
        includeColorTag: colorFlag,
      });
      setParseResult(res);

      if (fileNameHint) {
        const baseName = fileNameHint.replace(/\.[^.]+$/, '');
        setTargetTitle((prev) => prev || baseName);
        setTargetId((prev) => prev || slugify(baseName));
        const dMatch = baseName.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (dMatch) setRecordedDate(dMatch[1]);
      } else {
        setTargetTitle((prev) => prev || 'Tracklist Importata da Rekordbox');
        setTargetId((prev) => prev || `import-${new Date().toISOString().slice(0, 10)}`);
      }
    } catch (err) {
      setParseResult(null);
      setParseError(err instanceof Error ? err.message : 'Errore parsing file Rekordbox.');
    } finally {
      setParsing(false);
    }
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return;
    setSourceFileName(file.name);
    const buffer = await file.arrayBuffer();
    const decoded = decodeRekordboxTextFile(buffer);
    setRawText(decoded);
    await runParse(decoded, includeColorTag, file.name);
  }

  function handleConfirmImport() {
    if (!parseResult || parseResult.entries.length === 0) return;
    const cleanId = slugify(targetId || targetTitle || sourceFileName || 'rekordbox-import');
    const cleanTitle = targetTitle.trim() || sourceFileName || 'Tracklist Rekordbox';

    const tl: TracklistData = {
      id: cleanId,
      title: cleanTitle,
      sourceType: 'file',
      sourceName: sourceFileName || 'Incolla Testo Rekordbox',
      ...(recordedDate && /^\d{4}-\d{2}-\d{2}$/.test(recordedDate) ? { recordedDate } : {}),
      updatedAt: new Date().toISOString(),
      tracks: parseResult.entries,
    };
    onImport(tl);
  }

  const totalAnomalies = parseResult
    ? Object.values(parseResult.anomaliesByIndex).reduce((acc, list) => acc + list.length, 0)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#0a0a0c] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/35 mb-1">
              Supporta UTF-16LE / UTF-8 BOM • .txt / .tsv / .csv
            </span>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Importa File Singolo / Incolla Testo Rekordbox
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

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-12 gap-4">
            <label className="col-span-5 rounded-2xl border-2 border-dashed border-white/20 hover:border-fuchsia-400/60 bg-white/[0.02] p-4 flex flex-col items-center justify-center text-center cursor-pointer">
              <input
                type="file"
                accept=".txt,.tsv,.csv,text/plain,text/tab-separated-values,text/csv"
                className="hidden"
                onChange={(e) => void handleFileUpload(e.target.files?.[0] || null)}
              />
              <i className="fas fa-file-lines text-2xl text-fuchsia-300 mb-2" />
              <span className="font-bold text-white">
                {sourceFileName || 'Carica export .txt / .tsv / .csv'}
              </span>
              <span className="text-[11px] text-gray-400 mt-1">
                Decodifica automatica UTF-16 LE (export nativo Rekordbox) e UTF-8.
              </span>
            </label>

            <div className="col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Oppure incolla direttamente il testo tabellare
                </span>
                <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] text-gray-200">
                  <input
                    type="checkbox"
                    checked={includeColorTag}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIncludeColorTag(next);
                      if (rawText.trim()) {
                        void runParse(rawText, next, sourceFileName || undefined);
                      }
                    }}
                    className="accent-neonPurple"
                  />
                  <span>Includi etichetta Color nei My Tag</span>
                </label>
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={'#\tDJ Play Count\tRating\tColor\tTrack Title\tArtist\tBPM\tKey\tGenre\tRemixer\tLocation...'}
                className="w-full rounded-2xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none p-3 font-mono text-[11px] text-white"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!rawText.trim() || parsing}
                  onClick={() => void runParse(rawText, includeColorTag, sourceFileName || undefined)}
                  className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-45 text-white font-semibold"
                >
                  {parsing ? 'Analisi...' : 'Analizza Testo'}
                </button>
              </div>
            </div>
          </div>

          {parseError && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-3 text-red-200">
              {parseError}
            </div>
          )}

          {parseResult && (
            <>
              <div className="grid grid-cols-3 gap-3">
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
                    Data (opzionale)
                  </label>
                  <input
                    type="date"
                    value={recordedDate}
                    onChange={(e) => setRecordedDate(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2">
                <span>
                  Tracce riconosciute: <strong className="text-white">{parseResult.totalRows}</strong>{' '}
                  • Colonne rilevate: <span className="text-gray-400">{parseResult.detectedColumns.length}</span>
                </span>
                {totalAnomalies > 0 && (
                  <span className="text-amber-300 font-semibold">
                    <i className="fas fa-triangle-exclamation mr-1" />
                    {totalAnomalies} anomalie di formattazione
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
                {parseResult.entries.map((entry) => {
                  const rowAnoms = parseResult.anomaliesByIndex[entry.index] || [];
                  return (
                    <div
                      key={entry.index}
                      className={`rounded-xl px-3 py-2 flex items-center justify-between gap-3 border ${
                        rowAnoms.length > 0
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-400 text-[11px]">#{entry.index}</span>
                          <span className="font-semibold text-white truncate">{entry.title}</span>
                          {entry.trackType !== 'original' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-neonPurple/20 text-purple-300 border border-neonPurple/35">
                              {entry.trackType}
                            </span>
                          )}
                          {entry.rating !== undefined && entry.rating > 0 && (
                            <span className="text-amber-300 text-[10px]">
                              {'★'.repeat(entry.rating)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {entry.artist}
                          {entry.myTags.length > 0 && (
                            <span className="text-fuchsia-300 ml-2">
                              [{entry.myTags.join(', ')}]
                            </span>
                          )}
                        </div>
                        {rowAnoms.length > 0 && (
                          <div className="text-[10px] text-amber-300 mt-0.5">
                            {rowAnoms.map((a) => a.message).join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right font-mono text-[11px] text-gray-400 flex-shrink-0">
                        {entry.bpm ? `${entry.bpm} BPM` : ''} {entry.key || ''}
                      </div>
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
            Annulla
          </button>
          <button
            type="button"
            disabled={!parseResult || parseResult.entries.length === 0 || parsing}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-neonPurple hover:bg-purple-500 disabled:opacity-45"
          >
            Importa {parseResult?.entries.length ?? 0} Tracce
          </button>
        </div>
      </div>
    </div>
  );
};
