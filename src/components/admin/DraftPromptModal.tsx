import React, { useState } from 'react';
import { useAdminWorkspace } from './AdminWorkspaceContext';

function formatDraftDate(iso: string): string {
  if (!iso) return 'Data sconosciuta';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DraftPromptModal: React.FC = () => {
  const {
    showDraftPrompt,
    draftStatus,
    snapshotLoading,
    discardingDraft,
    resumeDraft,
    discardActiveDraft,
  } = useAdminWorkspace();

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const activeDraft = draftStatus?.activeDraft;
  if (!showDraftPrompt || !activeDraft) {
    return null;
  }

  const busy = snapshotLoading || discardingDraft;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#0a0a0c] border border-neonPurple/45 p-6 sm:p-7 shadow-[0_0_50px_rgba(168,85,247,0.25)] flex flex-col gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neonPurple/20 border border-neonPurple/40 text-neonPurple flex items-center justify-center flex-shrink-0">
            <i className="fas fa-code-branch text-base" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/35 mb-1.5">
              Bozza Esistente Rilevata
            </span>
            <h2 id="draft-prompt-title" className="text-lg sm:text-xl font-black text-white">
              È presente una sessione di bozza aperta
            </h2>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Il portale consente una sola branch <code className="text-purple-300">draft/*</code>{' '}
              attiva alla volta. Scegli se riprendere il lavoro salvato o archiviare e scartare la
              bozza per ripartire da <code className="text-purple-300">{draftStatus?.baseBranch}</code>.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex flex-col gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-400">Branch</span>
            <code className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-purple-300 font-mono text-[11px]">
              {activeDraft.branch}
            </code>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-400">Ultimo commit</span>
            <span className="text-gray-200 font-medium text-right truncate max-w-[260px]">
              {activeDraft.commit.message}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-400">Autore &amp; Data</span>
            <span className="text-gray-300">
              {activeDraft.commit.author} • {formatDraftDate(activeDraft.commit.date)}
            </span>
          </div>
          {activeDraft.openPr && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-gray-400">Pull Request aperta</span>
              <a
                href={activeDraft.openPr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neonPurple hover:text-purple-300 font-semibold inline-flex items-center gap-1"
              >
                <span>PR #{activeDraft.openPr.number}</span>
                <i className="fas fa-arrow-up-right-from-square text-[10px]" />
              </a>
            </div>
          )}
        </div>

        {confirmDiscard ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-4 flex flex-col gap-3">
            <p className="text-xs text-red-100 leading-relaxed">
              Confermi di voler scartare <code className="font-mono">{activeDraft.branch}</code>?
              Verrà creato un Git Tag di archiviazione (<code className="font-mono">archive/draft/...</code>),
              l&apos;eventuale PR aperta sarà chiusa e la branch verrà eliminata.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDiscard(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-gray-200 bg-white/10 hover:bg-white/20 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void discardActiveDraft()}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors inline-flex items-center gap-1.5"
              >
                {discardingDraft ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin text-[10px]" />
                    <span>Archiviazione...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-can text-[10px]" />
                    <span>Conferma Scarto Bozza</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void resumeDraft()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-neonPurple hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider py-3 px-4 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)]"
            >
              {snapshotLoading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs" />
                  <span>Caricamento bozza...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play text-xs" />
                  <span>Riprendi la bozza esistente</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDiscard(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/15 hover:border-red-500/40 disabled:opacity-60 text-gray-200 hover:text-red-100 text-xs font-bold uppercase tracking-wider py-3 px-4 transition-all"
            >
              <i className="fas fa-box-archive text-xs" />
              <span>Chiudi e scarta la bozza</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
