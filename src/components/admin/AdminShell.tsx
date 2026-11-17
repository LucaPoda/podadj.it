import React, { useState } from 'react';
import { ADMIN_TABS, type AdminTabConfig, type AdminTabId } from './tabsConfig';
import {
  useAdminWorkspace,
  type AdminDashboardStats,
} from './AdminWorkspaceContext';
import { DraftPromptModal } from './DraftPromptModal';
import { ReviewPublishTab } from './ReviewPublishTab';
import { TracklistsTab } from './TracklistsTab';
import type { SiteLinks } from '../../schemas/siteLinks';

interface AdminShellProps {
  onLogout: () => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({ onLogout }) => {
  const {
    githubConfigured,
    baseBranch,
    missingEnv,
    activeBranch,
    statusLoading,
    snapshotLoading,
    totalPendingDiffs,
    localUnsavedDiffs,
    stats,
    siteLinks,
  } = useAdminWorkspace();

  const [activeTabId, setActiveTabId] = useState<AdminTabId>('overview');
  const [loggingOut, setLoggingOut] = useState(false);

  const activeTab: AdminTabConfig =
    ADMIN_TABS.find((t) => t.id === activeTabId) ?? ADMIN_TABS[0];

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

  const isDraftBranch = activeBranch.startsWith('draft/');

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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  PODA Admin
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Sessione Attiva
                </span>
                {githubConfigured && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                      isDraftBranch
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        : 'bg-white/5 text-gray-300 border-white/15'
                    }`}
                  >
                    <i className="fas fa-code-branch text-[8px]" />
                    <span className="max-w-[160px] truncate">{activeBranch}</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Fase 2 — GitHub REST API, Bozze &amp; Pull Request
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <i className="fas fa-arrow-up-right-from-square text-[10px]" />
              <span className="hidden sm:inline">Apri Sito</span>
            </a>
            <button
              type="button"
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-red-200 hover:text-white bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 transition-all disabled:opacity-60"
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
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-neonPurple text-white">
                      {totalPendingDiffs.length}
                    </span>
                  )}
                  {tab.desktopOnly && (
                    <span
                      title="Solo Desktop"
                      className="lg:hidden inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white/10 text-gray-300"
                    >
                      Desktop
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="w-full">
        {activeTab.desktopOnly ? (
          <>
            {/* Mobile / Tablet (< 1024px) Desktop-only Guard */}
            <section className="block lg:hidden rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-neonPurple/15 border border-neonPurple/35 text-neonPurple flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-desktop text-lg" />
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-300 border border-white/10 mb-2">
                {activeTab.label}
              </span>
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
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-neonPurple text-white hover:bg-purple-500 transition-colors"
                >
                  Vai a Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabId('review-publish')}
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-gray-200 hover:bg-white/20 border border-white/15 transition-colors"
                >
                  Revisione &amp; Pubblicazione
                </button>
              </div>
            </section>

            {/* Desktop (>= 1024px) Workspace */}
            <div className="hidden lg:block">
              {activeTab.id === 'tracklists' ? (
                <TracklistsTab />
              ) : (
                <TabPlaceholderPanel tab={activeTab} />
              )}
            </div>
          </>
        ) : activeTab.id === 'review-publish' ? (
          <ReviewPublishTab />
        ) : (
          <TabContentMobileFriendly
            tab={activeTab}
            stats={stats}
            siteLinks={siteLinks}
            githubConfigured={githubConfigured}
            missingEnv={missingEnv}
            baseBranch={baseBranch}
            activeBranch={activeBranch}
            pendingCount={totalPendingDiffs.length}
            unsavedCount={localUnsavedDiffs.length}
            loading={statusLoading || snapshotLoading}
            onNavigate={setActiveTabId}
          />
        )}
      </main>
    </div>
  );
};

interface MobileTabProps {
  tab: AdminTabConfig;
  stats: AdminDashboardStats;
  siteLinks: SiteLinks;
  githubConfigured: boolean;
  missingEnv: string[];
  baseBranch: string;
  activeBranch: string;
  pendingCount: number;
  unsavedCount: number;
  loading: boolean;
  onNavigate: (tabId: AdminTabId) => void;
}

const TabContentMobileFriendly: React.FC<MobileTabProps> = ({
  tab,
  stats,
  siteLinks,
  githubConfigured,
  missingEnv,
  baseBranch,
  activeBranch,
  pendingCount,
  unsavedCount,
  loading,
  onNavigate,
}) => {
  if (tab.id === 'overview') {
    const statCards = [
      { label: 'Eventi JSON', value: stats.eventsCount, icon: 'fa-calendar-days', accent: 'text-neonPurple' },
      { label: 'Tracklist JSON', value: stats.tracklistsCount, icon: 'fa-list-ol', accent: 'text-emerald-300' },
      { label: 'Demo Ufficiali', value: stats.demosCount, icon: 'fa-compact-disc', accent: 'text-amber-300' },
      { label: 'Live Sets', value: stats.liveSetsCount, icon: 'fa-wave-square', accent: 'text-cyan-300' },
      { label: 'Pacchetti Service', value: stats.techPackagesCount, icon: 'fa-sliders', accent: 'text-blue-300' },
      { label: 'Senza Tracklist', value: stats.eventsWithoutTracklist, icon: 'fa-list-check', accent: 'text-fuchsia-300' },
    ];

    return (
      <div className="flex flex-col gap-5">
        <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neonPurple/15 text-purple-300 border border-neonPurple/35">
                  {tab.phase} • Attivo
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-300 border border-white/10">
                  {loading ? 'Sincronizzazione...' : `Sorgente: ${activeBranch}`}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                {tab.label}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{tab.summary}</p>
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
              <span>GitHub non configurato</span>
            </strong>
            <p className="leading-relaxed">
              Le statistiche mostrano il fallback locale. Imposta{' '}
              <code className="font-mono text-white">{missingEnv.join(', ')}</code> per abilitare
              bozze (<code className="font-mono">draft/*</code>) e Pull Request su GitHub.
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <i className="fas fa-circle-check text-emerald-400 text-xs" />
              <span>Stato Workflow CMS</span>
            </h2>
            <ul className="flex flex-col gap-2 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-neonPurple mt-0.5" />
                <span>
                  Branch di lavoro attiva: <code className="text-white">{activeBranch}</code>{' '}
                  (produzione: <code className="text-gray-200">{baseBranch}</code>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-neonPurple mt-0.5" />
                <span>
                  File modificati rispetto a {baseBranch}:{' '}
                  <strong className="text-white">{pendingCount}</strong> (non salvati in locale:{' '}
                  <strong className="text-white">{unsavedCount}</strong>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fas fa-check text-neonPurple mt-0.5" />
                <span>
                  Eventi senza tracklist da completare:{' '}
                  <strong className="text-white">{stats.eventsWithoutTracklist}</strong>.
                </span>
              </li>
            </ul>
          </section>

          <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <i className="fas fa-list-ul text-neonPurple text-xs" />
              <span>Accesso Rapido Mobile-Friendly</span>
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Queste sezioni sono ottimizzate anche per l&apos;uso rapido da smartphone:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('texts-links')}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-neonPurple text-white border border-white/15 transition-all"
              >
                Testi, Link &amp; Traduzioni
              </button>
              <button
                type="button"
                onClick={() => onNavigate('review-publish')}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-neonPurple hover:bg-purple-500 text-white transition-all"
              >
                Revisione &amp; Pubblicazione
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <TabPlaceholderPanel tab={tab} />
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
          <i className="fas fa-link text-neonPurple text-xs" />
          <span>Sorgente Attuale: siteLinks.json (Solo Lettura)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              Email Ufficiale
            </span>
            <span className="text-white font-mono">{siteLinks.email}</span>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              Instagram PODA
            </span>
            <span className="text-white font-mono">{siteLinks.socials.instagramPoda.handle}</span>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              TikTok
            </span>
            <span className="text-white font-mono">{siteLinks.socials.tiktok.handle}</span>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
              Instagram Partyhive
            </span>
            <span className="text-white font-mono">
              {siteLinks.socials.instagramPartyhive.handle}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

const TabPlaceholderPanel: React.FC<{ tab: AdminTabConfig }> = ({ tab }) => {
  return (
    <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-neonPurple/15 text-purple-300 border border-neonPurple/35">
              {tab.phase}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-300 border border-white/10">
              {tab.desktopOnly ? 'Desktop-Only' : 'Desktop & Mobile'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <i className={`${tab.icon} text-neonPurple text-lg`} />
            <span>{tab.label}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1.5 max-w-2xl leading-relaxed">
            {tab.summary}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/15 p-5 flex flex-col gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
          Modulo pronto per l&apos;implementazione ({tab.phase})
        </span>
        <ul className="flex flex-col gap-2 text-xs text-gray-300">
          {tab.plannedFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <i className="fas fa-chevron-right text-neonPurple text-[10px] mt-1 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
