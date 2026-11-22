import React, { useState } from 'react';
import { ADMIN_TABS, type AdminTabConfig, type AdminTabId } from './tabsConfig';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import { DraftPromptModal } from './DraftPromptModal';
import { OverviewTab } from './OverviewTab';
import { TracklistsTab } from './TracklistsTab';
import { EventsTab } from './EventsTab';
import { DemosLiveSetsTab } from './DemosLiveSetsTab';
import { ReviewPublishTab } from './ReviewPublishTab';
import { TechSideTab } from './TechSideTab';
import { FramingEditorTab } from './FramingEditorTab';
import { TextsLinksTab } from './TextsLinksTab';

interface AdminShellProps {
  onLogout: () => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({ onLogout }) => {
  const {
    githubConfigured,
    activeBranch,
    totalPendingDiffs,
    aiIsBlocked,
    aiDisabledReason,
    clearAiNotice,
  } = useAdminWorkspace();

  const [activeTabId, setActiveTabId] = useState<AdminTabId>('overview');
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusedTracklistId, setFocusedTracklistId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const activeTab: AdminTabConfig =
    ADMIN_TABS.find((t) => t.id === activeTabId) ?? ADMIN_TABS[0];

  function openEventInTab(eventId: string) {
    setFocusedEventId(eventId);
    setActiveTabId('events');
  }

  function openTracklistInTab(tracklistId?: string) {
    setFocusedTracklistId(tracklistId ?? null);
    setActiveTabId('tracklists');
  }

  async function handleLogoutClick() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      setLoggingOut(false);
      onLogout();
    }
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <DraftPromptModal />

      {/* Top Bar (always accessible) */}
      <header className="w-full rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Poda DJ"
              width="104"
              height="34"
              className="w-24 sm:w-28 drop-shadow-md"
            />
            <div className="h-6 w-px bg-white/15 hidden sm:block" />
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  PODA Admin
                </span>
                {githubConfigured && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
                    <i className="fas fa-code-branch text-[10px] text-neonPurple" />
                    <span className="max-w-[180px] truncate">{activeBranch}</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Gestione contenuti, tracklist, eventi e pubblicazione
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <i className="fas fa-arrow-up-right-from-square text-[10px]" />
              <span className="hidden sm:inline">Apri Sito</span>
            </a>
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-red-200 hover:text-white bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 transition-all disabled:opacity-60"
            >
              <i className="fas fa-right-from-bracket text-[10px]" />
              <span>{loggingOut ? 'Uscita...' : 'Esci'}</span>
            </button>
          </div>
        </div>

        {/* 8-Tab Navigation Bar */}
        <nav aria-label="Sezioni Admin" className="w-full">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
            {ADMIN_TABS.map((tab) => {
              const isActive = tab.id === activeTabId;
              const showPendingCount =
                tab.id === 'review-publish' && totalPendingDiffs.length > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-neonPurple/20 text-white border-neonPurple/60 shadow-[0_0_16px_rgba(168,85,247,0.28)]'
                      : 'bg-white/[0.03] text-gray-300 hover:text-white hover:bg-white/[0.08] border-white/10'
                  }`}
                >
                  <i
                    className={`${tab.icon} text-[11px] ${
                      isActive ? 'text-neonPurple' : 'text-gray-400'
                    }`}
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {showPendingCount && (
                    <span className="text-[11px] font-mono font-bold text-neonPurple">
                      ({totalPendingDiffs.length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Global Non-Blocking AI Quota / Config Notice */}
      {aiDisabledReason && (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 flex items-start justify-between gap-3 text-xs text-amber-100"
        >
          <div className="flex items-start gap-2.5">
            <i
              className={`fas ${
                aiIsBlocked ? 'fa-hourglass-half' : 'fa-wand-magic-sparkles'
              } text-amber-300 mt-0.5`}
            />
            <div>
              <strong className="font-bold text-amber-200">
                Assistente AI Gemini temporaneamente non disponibile:
              </strong>{' '}
              <span>{aiDisabledReason}</span>
              <span className="text-amber-200/80 ml-1">
                (Tutte le modifiche manuali, bozze e pubblicazioni PR continuano a funzionare.)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAiNotice}
            title="Chiudi avviso"
            className="text-amber-200 hover:text-white flex-shrink-0"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="w-full">
        {activeTab.desktopOnly ? (
          <>
            {/* Mobile / Tablet (< 1024px) Desktop-only Guard */}
            <section className="block lg:hidden rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-neonPurple/15 border border-neonPurple/35 text-neonPurple flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-desktop text-lg" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-purple-300 mb-1">
                {activeTab.label}
              </p>
              <h2 className="text-lg font-extrabold text-white mb-2">
                Questa sezione è disponibile solo da desktop
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto mb-5">
                Per modificare tabelle, tracklist o parametri di framing in sicurezza utilizza uno
                schermo desktop (almeno 1024px). Da smartphone puoi comunque consultare{' '}
                <strong className="text-gray-200">Overview &amp; To-Do</strong>,{' '}
                <strong className="text-gray-200">Testi, Link &amp; Traduzioni</strong> e{' '}
                <strong className="text-gray-200">Revisione &amp; Pubblicazione</strong>.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTabId('overview')}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-neonPurple text-white hover:bg-purple-500 transition-colors"
                >
                  Vai a Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabId('review-publish')}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 text-gray-200 hover:bg-white/20 border border-white/15 transition-colors"
                >
                  Revisione &amp; Pubblicazione
                </button>
              </div>
            </section>

            {/* Desktop (>= 1024px) Workspace */}
            <div className="hidden lg:block">
              {activeTab.id === 'tracklists' ? (
                <TracklistsTab
                  key={focusedTracklistId ?? 'tracklists-default'}
                  initialTracklistId={focusedTracklistId}
                />
              ) : activeTab.id === 'events' ? (
                <EventsTab
                  key={focusedEventId ?? 'events-default'}
                  initialEventId={focusedEventId}
                  onOpenTracklist={openTracklistInTab}
                />
              ) : activeTab.id === 'demo-live' ? (
                <DemosLiveSetsTab onOpenTracklist={openTracklistInTab} />
              ) : activeTab.id === 'tech-side' ? (
                <TechSideTab />
              ) : (
                <FramingEditorTab />
              )}
            </div>
          </>
        ) : activeTab.id === 'overview' ? (
          <OverviewTab
            onNavigate={setActiveTabId}
            onOpenEvent={openEventInTab}
            onOpenTracklist={openTracklistInTab}
          />
        ) : activeTab.id === 'review-publish' ? (
          <ReviewPublishTab />
        ) : (
          <TextsLinksTab />
        )}
      </main>
    </div>
  );
};
