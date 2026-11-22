import React, { useMemo, useState } from 'react';
import type { EventData } from '../../schemas/events';
import type { TracklistData } from '../../schemas/tracklist';
import type { LiveSet } from '../../schemas/liveSets';
import { FORMAT_META, getFormatMeta } from '../../schemas/common';
import {
  buildRomeIsoDateTime,
  extractRomeDateAndTime,
  isEventPast,
} from '../../lib/eventsLifecycle';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import { AiBilingualField } from './AiBilingualField';

const EVENT_PREFIX = 'src/content/events/';
const TRACKLIST_PREFIX = 'src/content/tracklists/';

function toEventPath(id: string): string {
  return `${EVENT_PREFIX}${id}.json`;
}

function slugify(val: string): string {
  const s = val
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || `event-${Date.now()}`;
}

interface EventsTabProps {
  initialEventId?: string | null;
  onOpenTracklist: (tracklistId?: string) => void;
}

export const EventsTab: React.FC<EventsTabProps> = ({
  initialEventId,
  onOpenTracklist,
}) => {
  const { workingSnapshot, updateContentFile, deleteContentFile } = useAdminWorkspace();

  const eventsMap = useMemo(() => {
    const out: Record<string, EventData> = {};
    for (const [fp, data] of Object.entries(workingSnapshot)) {
      if (fp.startsWith(EVENT_PREFIX) && fp.endsWith('.json') && data) {
        out[fp] = data as EventData;
      }
    }
    return out;
  }, [workingSnapshot]);

  const tracklistsList = useMemo(() => {
    const list: TracklistData[] = [];
    for (const [fp, data] of Object.entries(workingSnapshot)) {
      if (fp.startsWith(TRACKLIST_PREFIX) && fp.endsWith('.json') && data) {
        list.push(data as TracklistData);
      }
    }
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [workingSnapshot]);

  const liveSetsList = useMemo(() => {
    const raw = workingSnapshot['src/data/liveSets.json'];
    return Array.isArray(raw) ? (raw as LiveSet[]) : [];
  }, [workingSnapshot]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialEventId ? toEventPath(initialEventId) : null
  );
  const [renameIdInput, setRenameIdInput] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const { upcomingPaths, pastPaths } = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();
    const matchingPaths = Object.keys(eventsMap).filter((fp) => {
      if (!q) return true;
      const ev = eventsMap[fp];
      return (
        ev.id.toLowerCase().includes(q) ||
        ev.title.it.toLowerCase().includes(q) ||
        ev.title.en.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        (ev.venue || '').toLowerCase().includes(q)
      );
    });

    const up = matchingPaths
      .filter((fp) => !isEventPast(eventsMap[fp], now))
      .sort((a, b) => Date.parse(eventsMap[a].startAt) - Date.parse(eventsMap[b].startAt));

    const past = matchingPaths
      .filter((fp) => isEventPast(eventsMap[fp], now))
      .sort((a, b) => Date.parse(eventsMap[b].startAt) - Date.parse(eventsMap[a].startAt));

    return { upcomingPaths: up, pastPaths: past };
  }, [eventsMap, searchQuery]);

  const activePath =
    selectedPath && eventsMap[selectedPath]
      ? selectedPath
      : upcomingPaths[0] ?? pastPaths[0] ?? null;
  const activeEvent = activePath ? eventsMap[activePath] : null;

  function saveEvent(next: EventData, prevPath?: string) {
    const nextPath = toEventPath(next.id);
    if (prevPath && prevPath !== nextPath) {
      deleteContentFile(prevPath);
    }
    updateContentFile(nextPath, next);
    setSelectedPath(nextPath);
  }

  function handleCreateEvent() {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const nextDay = new Date(Date.now() + 2 * 86_400_000);
    const startDate = tomorrow.toISOString().slice(0, 10);
    const endDate = nextDay.toISOString().slice(0, 10);

    const baseId = `nuovo-evento-${startDate}`;
    let candidate = baseId;
    let counter = 2;
    while (eventsMap[toEventPath(candidate)]) {
      candidate = `${baseId}-${counter}`;
      counter += 1;
    }

    const created: EventData = {
      id: candidate,
      date: startDate,
      startAt: buildRomeIsoDateTime(startDate, '22:30'),
      endAt: buildRomeIsoDateTime(endDate, '02:00'),
      title: {
        it: 'Nuovo Evento',
        en: 'New Event',
      },
      location: 'Trento (TN)',
      venue: '',
      format: 'THE PARTY SIDE',
      audioSetup: '',
      notes: { it: '', en: '' },
      tracklist: [],
    };

    saveEvent(created);
  }

  function handleDuplicate() {
    if (!activeEvent) return;
    let candidate = `${activeEvent.id}-copy`;
    let counter = 2;
    while (eventsMap[toEventPath(candidate)]) {
      candidate = `${activeEvent.id}-copy-${counter}`;
      counter += 1;
    }
    saveEvent({
      ...JSON.parse(JSON.stringify(activeEvent)),
      id: candidate,
      title: {
        it: `${activeEvent.title.it} (Copia)`,
        en: `${activeEvent.title.en} (Copy)`,
      },
    });
  }

  function handleDelete() {
    if (!activePath) return;
    deleteContentFile(activePath);
    setSelectedPath(null);
  }

  function handleRenameId() {
    if (!activeEvent || !activePath) return;
    const nextId = slugify(renameIdInput);
    if (!nextId || nextId === activeEvent.id) return;
    if (eventsMap[toEventPath(nextId)]) {
      setRenameError(`Esiste già un evento con ID "${nextId}".`);
      return;
    }
    setRenameError(null);
    saveEvent({ ...activeEvent, id: nextId }, activePath);
    setRenameIdInput('');
  }

  const startParts = activeEvent
    ? extractRomeDateAndTime(activeEvent.startAt)
    : { date: '', time: '' };
  const endParts = activeEvent
    ? extractRomeDateAndTime(activeEvent.endAt)
    : { date: '', time: '' };

  const invalidTimeOrder = activeEvent
    ? Date.parse(activeEvent.endAt) <= Date.parse(activeEvent.startAt)
    : false;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Toolbar */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            Events ({Object.keys(eventsMap).length})
          </h1>
        </div>

        <button
          type="button"
          onClick={handleCreateEvent}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-neonPurple hover:bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.35)]"
        >
          <i className="fas fa-plus text-[11px]" />
          <span>Nuovo Evento</span>
        </button>
      </section>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <aside className="col-span-4 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-4 shadow-xl flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca evento per titolo o città..."
            className="w-full rounded-2xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none px-3 py-2 text-xs text-white"
          />

          {/* Upcoming */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 px-1">
              Prossimi Eventi ({upcomingPaths.length})
            </span>
            {upcomingPaths.length === 0 ? (
              <p className="text-[11px] text-gray-500 px-1">Nessun evento futuro.</p>
            ) : (
              upcomingPaths.map((fp) => {
                const ev = eventsMap[fp];
                const isSelected = fp === activePath;
                return (
                  <button
                    key={fp}
                    type="button"
                    onClick={() => {
                      setSelectedPath(fp);
                      setRenameIdInput('');
                      setRenameError(null);
                    }}
                    className={`w-full text-left rounded-2xl p-3 border transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-neonPurple/20 border-neonPurple/60 text-white'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">{ev.title.it}</span>
                      <span className="text-[10px] font-mono text-emerald-300">{ev.date}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate">{ev.location}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Past */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 px-1">
              Eventi Passati ({pastPaths.length})
            </span>
            {pastPaths.map((fp) => {
              const ev = eventsMap[fp];
              const isSelected = fp === activePath;
              const hasTl = Boolean(ev.tracklistId || (ev.tracklist && ev.tracklist.length > 0));
              const hasDebrief = Boolean(ev.notes?.it?.trim() && ev.notes?.en?.trim() && ev.audioSetup?.trim());
              return (
                <button
                  key={fp}
                  type="button"
                  onClick={() => {
                    setSelectedPath(fp);
                    setRenameIdInput('');
                    setRenameError(null);
                  }}
                  className={`w-full text-left rounded-2xl p-3 border transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-neonPurple/20 border-neonPurple/60 text-white'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate">{ev.title.it}</span>
                    <span className="text-[10px] font-mono text-gray-400">{ev.date}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-gray-400 truncate">{ev.location}</span>
                    {(!hasTl || !hasDebrief) && (
                      <span className="text-amber-300 font-semibold flex-shrink-0">To-Do</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Editor */}
        <section className="col-span-8 rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 text-xs">
          {!activeEvent || !activePath ? (
            <div className="py-16 text-center text-gray-400">
              Seleziona o crea un evento per modificarlo.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <code className="text-[11px] text-purple-300 font-mono">{activePath}</code>
                  <span className="text-white/20">•</span>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      isEventPast(activeEvent) ? 'text-gray-400' : 'text-emerald-300'
                    }`}
                  >
                    {isEventPast(activeEvent) ? 'Passato' : 'Futuro'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-gray-200 font-semibold"
                  >
                    <i className="fas fa-copy mr-1" />
                    Duplica
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-semibold"
                  >
                    <i className="fas fa-trash-can mr-1" />
                    Elimina
                  </button>
                </div>
              </div>

              {/* Titles IT / EN */}
              <AiBilingualField
                labelIt="Titolo (IT)"
                labelEn="Title (EN)"
                valueIt={activeEvent.title.it}
                valueEn={activeEvent.title.en}
                onChangeIt={(it) =>
                  saveEvent({ ...activeEvent, title: { ...activeEvent.title, it } }, activePath)
                }
                onChangeEn={(en) =>
                  saveEvent({ ...activeEvent, title: { ...activeEvent.title, en } }, activePath)
                }
                context="event"
              />

              {/* Location, Venue, Format */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Location (Città)
                  </label>
                  <input
                    type="text"
                    value={activeEvent.location}
                    onChange={(e) =>
                      saveEvent({ ...activeEvent, location: e.target.value }, activePath)
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Venue (opzionale)
                  </label>
                  <input
                    type="text"
                    value={activeEvent.venue ?? ''}
                    onChange={(e) =>
                      saveEvent(
                        {
                          ...activeEvent,
                          venue: e.target.value.trim() ? e.target.value : undefined,
                        },
                        activePath
                      )
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Format Canonico
                  </label>
                  <select
                    value={getFormatMeta(activeEvent.format).fullTitle}
                    onChange={(e) =>
                      saveEvent(
                        { ...activeEvent, format: e.target.value as EventData['format'] },
                        activePath
                      )
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                  >
                    {(['mainstage', 'party', 'groove', 'tech'] as const).map((key) => (
                      <option key={key} value={FORMAT_META[key].fullTitle}>
                        {FORMAT_META[key].fullTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Explicit Start/End Date & Time (Post-midnight support) */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neonPurple">
                  Orari Espliciti (Europe/Rome — supporta chiusura post-mezzanotte)
                </span>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Data Inizio
                    </label>
                    <input
                      type="date"
                      value={startParts.date}
                      onChange={(e) => {
                        const d = e.target.value;
                        if (!d) return;
                        saveEvent(
                          {
                            ...activeEvent,
                            date: d,
                            startAt: buildRomeIsoDateTime(d, startParts.time),
                          },
                          activePath
                        );
                      }}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Ora Inizio
                    </label>
                    <input
                      type="time"
                      value={startParts.time}
                      onChange={(e) => {
                        const tVal = e.target.value;
                        if (!tVal) return;
                        saveEvent(
                          {
                            ...activeEvent,
                            startAt: buildRomeIsoDateTime(startParts.date, tVal),
                          },
                          activePath
                        );
                      }}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Data Fine
                    </label>
                    <input
                      type="date"
                      value={endParts.date}
                      onChange={(e) => {
                        const d = e.target.value;
                        if (!d) return;
                        saveEvent(
                          {
                            ...activeEvent,
                            endAt: buildRomeIsoDateTime(d, endParts.time),
                          },
                          activePath
                        );
                      }}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Ora Fine
                    </label>
                    <input
                      type="time"
                      value={endParts.time}
                      onChange={(e) => {
                        const tVal = e.target.value;
                        if (!tVal) return;
                        saveEvent(
                          {
                            ...activeEvent,
                            endAt: buildRomeIsoDateTime(endParts.date, tVal),
                          },
                          activePath
                        );
                      }}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                    />
                  </div>
                </div>
                {invalidTimeOrder && (
                  <p className="text-red-300 text-[11px] font-semibold">
                    Attenzione: l&apos;orario di fine deve essere successivo all&apos;orario di inizio.
                  </p>
                )}
              </div>

              {/* Linked Tracklist & Live Set */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-gray-400">
                      Tracklist Collegata (src/content/tracklists/)
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenTracklist(activeEvent.tracklistId)}
                      className="text-[10px] font-bold text-neonPurple hover:text-purple-300"
                    >
                      Apri Tracklists →
                    </button>
                  </div>
                  <select
                    value={activeEvent.tracklistId ?? ''}
                    onChange={(e) =>
                      saveEvent(
                        {
                          ...activeEvent,
                          tracklistId: e.target.value || undefined,
                        },
                        activePath
                      )
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                  >
                    <option value="">— Nessuna tracklist collegata —</option>
                    {tracklistsList.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.title} ({tl.tracks.length} tracce)
                      </option>
                    ))}
                  </select>
                  {activeEvent.tracklist && activeEvent.tracklist.length > 0 && !activeEvent.tracklistId && (
                    <span className="text-[10px] text-gray-400">
                      Fallback legacy inline: {activeEvent.tracklist.length} tracce presenti nell&apos;evento.
                    </span>
                  )}
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    Live Set Collegato (src/data/liveSets.json)
                  </label>
                  <select
                    value={activeEvent.liveSetId ?? ''}
                    onChange={(e) =>
                      saveEvent(
                        {
                          ...activeEvent,
                          liveSetId: e.target.value || undefined,
                        },
                        activePath
                      )
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-white"
                  >
                    <option value="">— Nessun live set collegato —</option>
                    {liveSetsList.map((ls) => (
                      <option key={ls.id} value={ls.id}>
                        {ls.title.it} ({ls.date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audio Setup & Notes IT/EN */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Setup Impianto Audio
                </label>
                <textarea
                  rows={2}
                  value={activeEvent.audioSetup}
                  onChange={(e) =>
                    saveEvent({ ...activeEvent, audioSetup: e.target.value }, activePath)
                  }
                  placeholder="es. 2x Proel DIVA 15A, 2x DIVA SUB 18A, Pioneer XDJ-RX3..."
                  className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-white"
                />
              </div>

              <AiBilingualField
                labelIt="Note Tecniche / Debriefing (IT)"
                labelEn="Technical Notes / Debriefing (EN)"
                valueIt={activeEvent.notes.it}
                valueEn={activeEvent.notes.en}
                onChangeIt={(it) =>
                  saveEvent({ ...activeEvent, notes: { ...activeEvent.notes, it } }, activePath)
                }
                onChangeEn={(en) =>
                  saveEvent({ ...activeEvent, notes: { ...activeEvent.notes, en } }, activePath)
                }
                context="event"
                multiline
                rows={3}
              />

              {/* Rename Slug ID */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <span className="text-[11px] text-gray-400">Rinomina slug ID:</span>
                <input
                  type="text"
                  value={renameIdInput}
                  onChange={(e) => setRenameIdInput(e.target.value)}
                  placeholder={activeEvent.id}
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
                {renameError && <span className="text-red-300 text-[11px]">{renameError}</span>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
