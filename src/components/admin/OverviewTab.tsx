import React, { useMemo } from 'react';
import type { EventData } from '../../schemas/events';
import type { TracklistData } from '../../schemas/tracklist';
import { getFormatMeta } from '../../schemas/common';
import { getEventTodoStatus } from '../../lib/eventsLifecycle';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import type { AdminTabId } from './tabsConfig';

interface OverviewTabProps {
  onNavigate: (tabId: AdminTabId) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenTracklist: (tracklistId?: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onNavigate,
  onOpenEvent,
  onOpenTracklist,
}) => {
  const {
    githubConfigured,
    baseBranch,
    missingEnv,
    activeBranch,
    draftStatus,
    statusLoading,
    snapshotLoading,
    workingSnapshot,
    totalPendingDiffs,
    localUnsavedDiffs,
    stats,
  } = useAdminWorkspace();

  const { upcomingCount, pastCount, todoEvents } = useMemo(() => {
    const tracklistsById: Record<string, TracklistData> = {};
    const events: EventData[] = [];

    for (const [filePath, data] of Object.entries(workingSnapshot)) {
      if (filePath.startsWith('src/content/tracklists/') && filePath.endsWith('.json') && data) {
        const tl = data as TracklistData;
        tracklistsById[tl.id] = tl;
      } else if (filePath.startsWith('src/content/events/') && filePath.endsWith('.json') && data) {
        events.push(data as EventData);
      }
    }

    const now = new Date();
    let upcoming = 0;
    let past = 0;
    const todos: Array<{
      event: EventData;
      missingTracklist: boolean;
      missingNotes: boolean;
      missingAudioSetup: boolean;
    }> = [];

    for (const ev of events) {
      const status = getEventTodoStatus(ev, tracklistsById, now);
      if (status.isPast) {
        past += 1;
        if (status.needsAttention) {
          todos.push({
            event: ev,
            missingTracklist: status.missingTracklist,
            missingNotes: status.missingNotes,
            missingAudioSetup: status.missingAudioSetup,
          });
        }
      } else {
        upcoming += 1;
      }
    }

    todos.sort((a, b) => Date.parse(b.event.startAt || b.event.date) - Date.parse(a.event.startAt || a.event.date));

    return {
      upcomingCount: upcoming,
      pastCount: past,
      todoEvents: todos,
    };
  }, [workingSnapshot]);

  const loading = statusLoading || snapshotLoading;

  const statCards = [
    { label: 'Eventi Totali', value: stats.eventsCount, icon: 'fa-calendar-days', accent: 'text-neonPurple' },
    { label: 'Prossimi / Passati', value: `${upcomingCount} / ${pastCount}`, icon: 'fa-clock', accent: 'text-emerald-300' },
    { label: 'Tracklist JSON', value: stats.tracklistsCount, icon: 'fa-list-ol', accent: 'text-cyan-300' },
    { label: 'Demo Ufficiali', value: stats.demosCount, icon: 'fa-compact-disc', accent: 'text-amber-300' },
    { label: 'Live Sets', value: stats.liveSetsCount, icon: 'fa-wave-square', accent: 'text-fuchsia-300' },
    { label: 'Da Completare', value: todoEvents.length, icon: 'fa-list-check', accent: todoEvents.length > 0 ? 'text-amber-300' : 'text-emerald-300' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Live Stats */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Overview &amp; To-Do
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {loading ? 'Sincronizzazione workspace...' : `Sorgente: ${activeBranch} · `}
              Stato contenuti ed eventi passati da completare.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">{card.label}</span>
                <i className={`fas ${card.icon} text-xs ${card.accent}`} />
              </div>
              <span className="text-2xl font-black text-white font-mono">{card.value}</span>
            </div>
          ))}
        </div>
      </section>

      {!githubConfigured && (
        <section className="rounded-3xl bg-amber-500/10 border border-amber-500/35 p-5 text-xs text-amber-100 flex flex-col gap-1.5">
          <strong className="text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-triangle-exclamation" />
            <span>Modalità Locale (GitHub non configurato)</span>
          </strong>
          <p className="leading-relaxed">
            Stai visualizzando lo snapshot locale di fallback. Imposta{' '}
            <code className="font-mono text-white">{missingEnv.join(', ')}</code> per abilitare
            bozze (<code className="font-mono">draft/*</code>) e Pull Request su GitHub.
          </p>
        </section>
      )}

      {/* Automatic To-Do Cards for Past Events */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <i className="fas fa-list-check text-neonPurple text-xs" />
              <span>To-Do Post-Evento ({todoEvents.length})</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Eventi passati che non hanno ancora una tracklist collegata o il debriefing tecnico completo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/15 border border-white/15 text-gray-200"
          >
            <span>Gestisci Tutti gli Eventi</span>
            <i className="fas fa-arrow-right text-[10px]" />
          </button>
        </div>

        {todoEvents.length === 0 ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-xs text-emerald-200 flex items-center gap-2.5">
            <i className="fas fa-circle-check text-emerald-400 text-sm" />
            <span>Tutti gli eventi passati hanno tracklist, setup audio e note tecniche compilati!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todoEvents.map(({ event, missingTracklist, missingNotes, missingAudioSetup }) => {
              const formatMeta = getFormatMeta(event.format);
              return (
                <article
                  key={event.id}
                  className="rounded-2xl bg-white/[0.03] border border-amber-500/25 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-gray-400">{event.date}</span>
                      <span className="font-bold uppercase tracking-wider text-gray-300">
                        {formatMeta.shortLabel}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">
                      {event.title.it}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      {missingTracklist && (
                        <span className="font-semibold text-amber-300">
                          <i className="fas fa-music mr-1 text-[10px]" />
                          Manca Tracklist
                        </span>
                      )}
                      {missingNotes && (
                        <span className="font-semibold text-rose-300">
                          <i className="fas fa-note-sticky mr-1 text-[10px]" />
                          Mancano Note IT/EN
                        </span>
                      )}
                      {missingAudioSetup && (
                        <span className="font-semibold text-rose-300">
                          <i className="fas fa-volume-high mr-1 text-[10px]" />
                          Manca Setup Audio
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop Quick Jump Buttons */}
                  <div className="hidden lg:flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event.id)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-neonPurple hover:bg-purple-500 text-white transition-colors"
                    >
                      Completa Evento
                    </button>
                    {missingTracklist && (
                      <button
                        type="button"
                        onClick={() => onOpenTracklist(event.tracklistId)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-gray-200 transition-colors"
                      >
                        Apri Tracklists
                      </button>
                    )}
                  </div>

                  {/* Mobile Notice */}
                  <div className="flex lg:hidden items-center gap-1.5 pt-2 border-t border-white/10 text-[11px] text-gray-400">
                    <i className="fas fa-desktop text-[10px] text-neonPurple" />
                    <span>Compilabile dalla vista desktop (Events / Tracklists).</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <i className="fas fa-code-branch text-neonPurple text-xs" />
            <span>Stato Bozza &amp; Pubblicazione</span>
          </h2>
          <ul className="flex flex-col gap-2 text-xs text-gray-300">
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-neonPurple mt-0.5" />
              <span>
                Branch corrente: <code className="text-white">{activeBranch}</code> (base:{' '}
                <code className="text-gray-200">{baseBranch}</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check text-neonPurple mt-0.5" />
              <span>
                Modifiche vs {baseBranch}:{' '}
                <strong className="text-white">{totalPendingDiffs.length}</strong> (non salvate in
                locale: <strong className="text-white">{localUnsavedDiffs.length}</strong>).
              </span>
            </li>
            {draftStatus?.openPullRequests && draftStatus.openPullRequests.length > 0 && (
              <li className="flex items-start gap-2">
                <i className="fas fa-code-pull-request text-emerald-400 mt-0.5" />
                <span>
                  PR aperte verso {baseBranch}:{' '}
                  <strong className="text-emerald-300">
                    {draftStatus.openPullRequests.length}
                  </strong>
                </span>
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <i className="fas fa-bolt text-neonPurple text-xs" />
            <span>Azioni Rapide Mobile-Friendly</span>
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Sezioni sempre accessibili anche da smartphone:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('texts-links')}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-neonPurple text-white border border-white/15 transition-all"
            >
              Testi, Link &amp; Traduzioni
            </button>
            <button
              type="button"
              onClick={() => onNavigate('review-publish')}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-neonPurple hover:bg-purple-500 text-white transition-all"
            >
              Revisione &amp; Pubblicazione
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
