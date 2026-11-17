import React, { useMemo, useState } from 'react';
import type { Demo, TrackHighlight } from '../../schemas/demos';
import type { LiveSet, MediaType } from '../../schemas/liveSets';
import type { EventData } from '../../schemas/events';
import type { TracklistData } from '../../schemas/tracklist';
import { useAdminWorkspace } from './AdminWorkspaceContext';

const DEMOS_PATH = 'src/data/demos.json';
const LIVE_SETS_PATH = 'src/data/liveSets.json';

function isValidHttpUrl(val?: string): boolean {
  if (!val) return false;
  try {
    const u = new URL(val);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

interface DemosLiveSetsTabProps {
  onOpenTracklist: (tracklistId?: string) => void;
}

export const DemosLiveSetsTab: React.FC<DemosLiveSetsTabProps> = ({ onOpenTracklist }) => {
  const { workingSnapshot, updateContentFile } = useAdminWorkspace();

  const [section, setSection] = useState<'demos' | 'liveSets'>('demos');
  const [selectedDemoIdx, setSelectedDemoIdx] = useState(0);
  const [selectedSetIdx, setSelectedSetIdx] = useState(0);

  const demos = useMemo(() => {
    const raw = workingSnapshot[DEMOS_PATH];
    return Array.isArray(raw) ? (raw as Demo[]) : [];
  }, [workingSnapshot]);

  const liveSets = useMemo(() => {
    const raw = workingSnapshot[LIVE_SETS_PATH];
    return Array.isArray(raw) ? (raw as LiveSet[]) : [];
  }, [workingSnapshot]);

  const eventsList = useMemo(() => {
    const out: EventData[] = [];
    for (const [fp, data] of Object.entries(workingSnapshot)) {
      if (fp.startsWith('src/content/events/') && fp.endsWith('.json') && data) {
        out.push(data as EventData);
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [workingSnapshot]);

  const tracklistsList = useMemo(() => {
    const out: TracklistData[] = [];
    for (const [fp, data] of Object.entries(workingSnapshot)) {
      if (fp.startsWith('src/content/tracklists/') && fp.endsWith('.json') && data) {
        out.push(data as TracklistData);
      }
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
  }, [workingSnapshot]);

  const safeDemoIdx = Math.min(selectedDemoIdx, Math.max(0, demos.length - 1));
  const activeDemo = demos[safeDemoIdx] ?? null;

  const safeSetIdx = Math.min(selectedSetIdx, Math.max(0, liveSets.length - 1));
  const activeSet = liveSets[safeSetIdx] ?? null;

  function saveDemos(next: Demo[]) {
    updateContentFile(DEMOS_PATH, next);
  }

  function updateActiveDemo(patch: Partial<Demo>) {
    if (!activeDemo) return;
    const next = [...demos];
    next[safeDemoIdx] = { ...activeDemo, ...patch };
    saveDemos(next);
  }

  function handleAddDemo() {
    const newDemo: Demo = {
      id: `demo-custom-${Date.now()}`,
      title: { it: 'Nuova Demo', en: 'New Demo' },
      date: new Date().toISOString().slice(0, 10),
      format: 'other',
      badge: { it: 'SPECIAL SELECTION', en: 'SPECIAL SELECTION' },
      soundcloudUrl: 'https://soundcloud.com/poda-dj',
      duration: '30:00',
      description: { it: 'Descrizione demo...', en: 'Demo description...' },
      tags: ['Electronic'],
      tracklistHighlights: [{ artist: 'PODA', title: 'Intro Edit' }],
    };
    const next = [...demos, newDemo];
    saveDemos(next);
    setSelectedDemoIdx(next.length - 1);
  }

  function handleDeleteDemo() {
    if (demos.length <= 1 || !activeDemo) return;
    const next = demos.filter((_, idx) => idx !== safeDemoIdx);
    saveDemos(next);
    setSelectedDemoIdx(Math.max(0, safeDemoIdx - 1));
  }

  function saveLiveSets(next: LiveSet[]) {
    updateContentFile(LIVE_SETS_PATH, next);
  }

  function updateActiveSet(patch: Partial<LiveSet>) {
    if (!activeSet) return;
    const next = [...liveSets];
    next[safeSetIdx] = { ...activeSet, ...patch };
    saveLiveSets(next);
  }

  function handleAddLiveSet() {
    const defaultSlug = eventsList[0]?.id || 'nuovo-evento';
    const newSet: LiveSet = {
      id: `liveset-${Date.now()}`,
      title: { it: 'Nuovo Live Set', en: 'New Live Set' },
      date: new Date().toISOString().slice(0, 10),
      venue: 'Club / Venue',
      city: 'Trento (TN)',
      format: 'party',
      timeSlot: { it: '22:00 - 00:00', en: '22:00 - 00:00' },
      description: { it: 'Resoconto del live set...', en: 'Live set debrief...' },
      eventSlug: defaultSlug,
      duration: '1h 00m',
      mediaType: 'soundcloud',
      mediaUrl: 'https://soundcloud.com/poda-dj',
    };
    const next = [newSet, ...liveSets];
    saveLiveSets(next);
    setSelectedSetIdx(0);
  }

  function handleDeleteLiveSet() {
    if (!activeSet) return;
    const next = liveSets.filter((_, idx) => idx !== safeSetIdx);
    saveLiveSets(next);
    setSelectedSetIdx(Math.max(0, safeSetIdx - 1));
  }

  const activeMediaUrl =
    activeSet?.mediaUrl ||
    activeSet?.mixcloudUrl ||
    activeSet?.youtubeUrl ||
    activeSet?.soundcloudUrl ||
    '';

  return (
    <div className="flex flex-col gap-5">
      {/* Top Toolbar & Sub-switcher */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neonPurple/15 text-purple-300 border border-neonPurple/35 mb-1">
            Fase 4 • demos.json &amp; liveSets.json
          </span>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            Demo &amp; Live Sets
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-black/50 border border-white/15 p-1">
            <button
              type="button"
              onClick={() => setSection('demos')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                section === 'demos'
                  ? 'bg-neonPurple text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Demo ({demos.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('liveSets')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                section === 'liveSets'
                  ? 'bg-neonPurple text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Live Sets ({liveSets.length})
            </button>
          </div>

          <button
            type="button"
            onClick={section === 'demos' ? handleAddDemo : handleAddLiveSet}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/15 text-white"
          >
            <i className="fas fa-plus text-[11px]" />
            <span>{section === 'demos' ? 'Nuova Demo' : 'Nuovo Live Set'}</span>
          </button>
        </div>
      </section>

      {section === 'demos' ? (
        <div className="grid grid-cols-12 gap-5 items-start">
          <aside className="col-span-4 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-4 shadow-xl flex flex-col gap-2">
            {demos.map((d, idx) => (
              <button
                key={`${d.id}-${idx}`}
                type="button"
                onClick={() => setSelectedDemoIdx(idx)}
                className={`w-full text-left rounded-2xl p-3 border transition-all flex flex-col gap-1 ${
                  idx === safeDemoIdx
                    ? 'bg-neonPurple/20 border-neonPurple/60 text-white'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{d.title.it}</span>
                  <span className="text-[10px] uppercase font-mono text-purple-300">{d.format}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">{d.id}</span>
              </button>
            ))}
          </aside>

          <section className="col-span-8 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 text-xs">
            {!activeDemo ? (
              <p className="text-gray-400">Nessuna demo presente.</p>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <code className="text-purple-300 font-mono">{activeDemo.id}</code>
                  <button
                    type="button"
                    onClick={handleDeleteDemo}
                    disabled={demos.length <= 1}
                    className="px-3 py-1 rounded-full bg-red-500/15 hover:bg-red-500/30 disabled:opacity-40 border border-red-500/30 text-red-200 font-semibold"
                  >
                    <i className="fas fa-trash-can mr-1" />
                    Elimina Demo
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      ID
                    </label>
                    <input
                      type="text"
                      value={activeDemo.id}
                      onChange={(e) => updateActiveDemo({ id: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Format
                    </label>
                    <select
                      value={activeDemo.format}
                      onChange={(e) =>
                        updateActiveDemo({ format: e.target.value as Demo['format'] })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    >
                      <option value="mainstage">mainstage</option>
                      <option value="party">party</option>
                      <option value="groove">groove</option>
                      <option value="other">other (Extra &amp; Eclectic)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={activeDemo.date}
                      onChange={(e) => updateActiveDemo({ date: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Titolo (IT)
                    </label>
                    <input
                      type="text"
                      value={activeDemo.title.it}
                      onChange={(e) =>
                        updateActiveDemo({ title: { ...activeDemo.title, it: e.target.value } })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Title (EN)
                    </label>
                    <input
                      type="text"
                      value={activeDemo.title.en}
                      onChange={(e) =>
                        updateActiveDemo({ title: { ...activeDemo.title, en: e.target.value } })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      SoundCloud URL
                    </label>
                    <input
                      type="url"
                      value={activeDemo.soundcloudUrl}
                      onChange={(e) => updateActiveDemo({ soundcloudUrl: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Durata
                    </label>
                    <input
                      type="text"
                      value={activeDemo.duration ?? ''}
                      onChange={(e) =>
                        updateActiveDemo({ duration: e.target.value.trim() || undefined })
                      }
                      placeholder="28:45"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Descrizione (IT)
                    </label>
                    <textarea
                      rows={2}
                      value={activeDemo.description.it}
                      onChange={(e) =>
                        updateActiveDemo({
                          description: { ...activeDemo.description, it: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Description (EN)
                    </label>
                    <textarea
                      rows={2}
                      value={activeDemo.description.en}
                      onChange={(e) =>
                        updateActiveDemo({
                          description: { ...activeDemo.description, en: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Linked Tracklist + Tags */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-gray-400">
                        Tracklist Completa Collegata (opzionale)
                      </label>
                      <button
                        type="button"
                        onClick={() => onOpenTracklist(activeDemo.tracklistId)}
                        className="text-[10px] font-bold text-neonPurple hover:text-purple-300"
                      >
                        Apri Tracklists →
                      </button>
                    </div>
                    <select
                      value={activeDemo.tracklistId ?? ''}
                      onChange={(e) =>
                        updateActiveDemo({ tracklistId: e.target.value || undefined })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    >
                      <option value="">— Usa Tracklist Highlights manuali —</option>
                      {tracklistsList.map((tl) => (
                        <option key={tl.id} value={tl.id}>
                          {tl.title} ({tl.tracks.length} tracce)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400">
                      Tags (separati da virgola)
                    </label>
                    <input
                      type="text"
                      value={activeDemo.tags.join(', ')}
                      onChange={(e) =>
                        updateActiveDemo({
                          tags: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Tracklist Highlights */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-300">
                      Tracklist Highlights ({activeDemo.tracklistHighlights.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveDemo({
                          tracklistHighlights: [
                            ...activeDemo.tracklistHighlights,
                            { artist: 'Artist', title: 'Track Title' },
                          ],
                        })
                      }
                      className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold"
                    >
                      + Aggiungi Highlight
                    </button>
                  </div>

                  {activeDemo.tracklistHighlights.map((hl: TrackHighlight, hIdx) => (
                    <div key={hIdx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={hl.artist}
                        onChange={(e) => {
                          const next = [...activeDemo.tracklistHighlights];
                          next[hIdx] = { ...hl, artist: e.target.value };
                          updateActiveDemo({ tracklistHighlights: next });
                        }}
                        placeholder="Artista"
                        className="col-span-4 rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        value={hl.title}
                        onChange={(e) => {
                          const next = [...activeDemo.tracklistHighlights];
                          next[hIdx] = { ...hl, title: e.target.value };
                          updateActiveDemo({ tracklistHighlights: next });
                        }}
                        placeholder="Titolo"
                        className="col-span-4 rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
                      />
                      <input
                        type="text"
                        value={hl.remix ?? ''}
                        onChange={(e) => {
                          const next = [...activeDemo.tracklistHighlights];
                          next[hIdx] = {
                            ...hl,
                            remix: e.target.value.trim() ? e.target.value : undefined,
                          };
                          updateActiveDemo({ tracklistHighlights: next });
                        }}
                        placeholder="Remix/Edit (opzionale)"
                        className="col-span-3 rounded-xl bg-black/50 border border-white/10 px-2.5 py-1.5 text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveDemo({
                            tracklistHighlights: activeDemo.tracklistHighlights.filter(
                              (_, i) => i !== hIdx
                            ),
                          })
                        }
                        className="col-span-1 p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-300"
                      >
                        <i className="fas fa-xmark" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5 items-start">
          <aside className="col-span-4 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-4 shadow-xl flex flex-col gap-2 max-h-[75vh] overflow-y-auto">
            {liveSets.map((ls, idx) => (
              <button
                key={`${ls.id}-${idx}`}
                type="button"
                onClick={() => setSelectedSetIdx(idx)}
                className={`w-full text-left rounded-2xl p-3 border transition-all flex flex-col gap-1 ${
                  idx === safeSetIdx
                    ? 'bg-neonPurple/20 border-neonPurple/60 text-white'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{ls.title.it}</span>
                  <span className="text-[10px] font-mono text-gray-400">{ls.date}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="uppercase">{ls.format}</span>
                  <span>{ls.mediaType || 'soundcloud'}</span>
                </div>
              </button>
            ))}
          </aside>

          <section className="col-span-8 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 text-xs">
            {!activeSet ? (
              <p className="text-gray-400">Nessun live set presente.</p>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <code className="text-purple-300 font-mono">{activeSet.id}</code>
                  <button
                    type="button"
                    onClick={handleDeleteLiveSet}
                    className="px-3 py-1 rounded-full bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-semibold"
                  >
                    <i className="fas fa-trash-can mr-1" />
                    Elimina Live Set
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      ID
                    </label>
                    <input
                      type="text"
                      value={activeSet.id}
                      onChange={(e) => updateActiveSet({ id: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Format
                    </label>
                    <select
                      value={activeSet.format}
                      onChange={(e) =>
                        updateActiveSet({ format: e.target.value as LiveSet['format'] })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    >
                      <option value="mainstage">mainstage</option>
                      <option value="party">party</option>
                      <option value="groove">groove</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={activeSet.date}
                      onChange={(e) => updateActiveSet({ date: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Titolo (IT)
                    </label>
                    <input
                      type="text"
                      value={activeSet.title.it}
                      onChange={(e) =>
                        updateActiveSet({ title: { ...activeSet.title, it: e.target.value } })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Title (EN)
                    </label>
                    <input
                      type="text"
                      value={activeSet.title.en}
                      onChange={(e) =>
                        updateActiveSet({ title: { ...activeSet.title, en: e.target.value } })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Evento Collegato (eventSlug)
                    </label>
                    <select
                      value={activeSet.eventSlug}
                      onChange={(e) => updateActiveSet({ eventSlug: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    >
                      {!eventsList.some((e) => e.id === activeSet.eventSlug) && (
                        <option value={activeSet.eventSlug}>{activeSet.eventSlug} (custom)</option>
                      )}
                      {eventsList.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title.it} ({ev.date})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={activeSet.venue}
                      onChange={(e) => updateActiveSet({ venue: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Città
                    </label>
                    <input
                      type="text"
                      value={activeSet.city}
                      onChange={(e) => updateActiveSet({ city: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Media URL + Validation */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-3">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Piattaforma
                      </label>
                      <select
                        value={activeSet.mediaType ?? 'soundcloud'}
                        onChange={(e) =>
                          updateActiveSet({ mediaType: e.target.value as MediaType })
                        }
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                      >
                        <option value="soundcloud">soundcloud</option>
                        <option value="mixcloud">mixcloud</option>
                        <option value="youtube">youtube</option>
                      </select>
                    </div>
                    <div className="col-span-7">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Media URL
                      </label>
                      <input
                        type="url"
                        value={activeMediaUrl}
                        onChange={(e) => {
                          const val = e.target.value.trim() || undefined;
                          updateActiveSet({
                            mediaUrl: val,
                            soundcloudUrl:
                              activeSet.mediaType === 'soundcloud' ? val : undefined,
                            mixcloudUrl: activeSet.mediaType === 'mixcloud' ? val : undefined,
                            youtubeUrl: activeSet.mediaType === 'youtube' ? val : undefined,
                          });
                        }}
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white font-mono text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Durata
                      </label>
                      <input
                        type="text"
                        value={activeSet.duration ?? ''}
                        onChange={(e) =>
                          updateActiveSet({ duration: e.target.value.trim() || undefined })
                        }
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-[11px]">
                    {isValidHttpUrl(activeMediaUrl) ? (
                      <span className="text-emerald-300">
                        <i className="fas fa-circle-check mr-1" />
                        URL media valido
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        <i className="fas fa-triangle-exclamation mr-1" />
                        Inserisci un URL valido (https://...)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Fascia Oraria (IT)
                    </label>
                    <input
                      type="text"
                      value={activeSet.timeSlot.it}
                      onChange={(e) =>
                        updateActiveSet({
                          timeSlot: { ...activeSet.timeSlot, it: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Time Slot (EN)
                    </label>
                    <input
                      type="text"
                      value={activeSet.timeSlot.en}
                      onChange={(e) =>
                        updateActiveSet({
                          timeSlot: { ...activeSet.timeSlot, en: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Descrizione (IT)
                    </label>
                    <textarea
                      rows={3}
                      value={activeSet.description.it}
                      onChange={(e) =>
                        updateActiveSet({
                          description: { ...activeSet.description, it: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Description (EN)
                    </label>
                    <textarea
                      rows={3}
                      value={activeSet.description.en}
                      onChange={(e) =>
                        updateActiveSet({
                          description: { ...activeSet.description, en: e.target.value },
                        })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
