import React, { useState } from 'react';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import type { DiffChangeKind, FileDiffSummary } from '../../lib/diff';

const STATUS_BADGES: Record<DiffChangeKind, { label: string; className: string }> = {
  added: {
    label: 'Nuovo',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  },
  modified: {
    label: 'Modificato',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  },
  deleted: {
    label: 'Eliminato',
    className: 'bg-red-500/15 text-red-300 border-red-500/35',
  },
};

export const ReviewPublishTab: React.FC = () => {
  const {
    githubConfigured,
    baseBranch,
    missingEnv,
    draftStatus,
    statusLoading,
    snapshotLoading,
    savingDraft,
    discardingDraft,
    publishing,
    activeBranch,
    pendingAssets,
    localUnsavedDiffs,
    totalPendingDiffs,
    hasAnyPendingBinary,
    validation,
    feedback,
    clearFeedback,
    refreshStatus,
    resetLocalChanges,
    unstageBinaryAsset,
    discardActiveDraft,
    saveAsDraft,
    publishToMain,
  } = useAdminWorkspace();

  const [draftTitle, setDraftTitle] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prNotes, setPrNotes] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const pendingAssetList = Object.values(pendingAssets);
  const isWorkingOnDraft = activeBranch.startsWith('draft/');
  const hasLocalUnsaved = localUnsavedDiffs.length > 0 || hasAnyPendingBinary;
  const hasAnyPendingChanges = totalPendingDiffs.length > 0 || hasAnyPendingBinary;
  const canSaveDraft = githubConfigured && hasLocalUnsaved && validation.ok && !savingDraft && !publishing;
  const canPublish =
    githubConfigured &&
    (hasAnyPendingChanges || isWorkingOnDraft) &&
    validation.ok &&
    !publishing &&
    !savingDraft;

  function toggleFile(path: string) {
    setExpandedFiles((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  }

  async function handleSaveDraft(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    await saveAsDraft({
      draftTitle: draftTitle.trim() || undefined,
      message: draftMessage.trim() || undefined,
    });
  }

  async function handlePublish(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    await publishToMain({
      title: prTitle.trim() || undefined,
      notes: prNotes.trim() || undefined,
    });
  }

  const openPrs = draftStatus?.openPullRequests ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Header Card */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-7 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
              <i className="fas fa-rocket text-neonPurple text-lg" />
              <span>Revisione &amp; Pubblicazione</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Controlla il riepilogo delle modifiche rispetto a <code className="text-purple-300">{baseBranch}</code>, salva una bozza temporanea o apri la Pull Request definitiva.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={statusLoading || !githubConfigured}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 disabled:opacity-50 transition-colors"
          >
            <i className={`fas fa-rotate text-[11px] ${statusLoading ? 'fa-spin' : ''}`} />
            <span>Aggiorna Stato PR</span>
          </button>
        </div>

        {/* Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Branch Attiva
            </span>
            <div className="flex items-center gap-2">
              <i
                className={`fas fa-code-branch text-xs ${
                  isWorkingOnDraft ? 'text-amber-300' : 'text-emerald-300'
                }`}
              />
              <code className="text-white font-mono truncate">{activeBranch}</code>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Validazione Zod
            </span>
            {validation.ok ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                <i className="fas fa-circle-check text-xs" />
                <span>Tutti i JSON validi</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-red-300 font-semibold">
                <i className="fas fa-circle-xmark text-xs" />
                <span>{Object.keys(validation.errors).length} file con errori</span>
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Modifiche Pendenti
            </span>
            <span className="text-white font-semibold">
              {totalPendingDiffs.length} file vs {baseBranch}{' '}
              {hasLocalUnsaved && (
                <span className="text-amber-300 font-normal">
                  ({localUnsavedDiffs.length} non salvati)
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* GitHub not configured warning */}
      {!githubConfigured && (
        <section
          role="alert"
          className="rounded-3xl bg-amber-500/10 border border-amber-500/35 p-5 sm:p-6 text-xs text-amber-100 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-300">
            <i className="fas fa-triangle-exclamation" />
            <span>Configurazione GitHub mancante</span>
          </div>
          <p className="leading-relaxed">
            Per leggere le bozze e aprire Pull Request imposta le variabili d&apos;ambiente mancanti:{' '}
            <code className="font-mono text-white">{missingEnv.join(', ')}</code> (vedi{' '}
            <code className="font-mono">.env.example</code>).
          </p>
        </section>
      )}

      {/* Anomalies Warning (multiple draft/* branches) */}
      {draftStatus?.anomalies && draftStatus.anomalies.length > 0 && (
        <section className="rounded-3xl bg-amber-500/10 border border-amber-500/35 p-4 sm:p-5 text-xs text-amber-100 flex flex-col gap-1.5">
          <div className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <i className="fas fa-code-fork" />
            <span>Attenzione: Branch multiple rilevate</span>
          </div>
          {draftStatus.anomalies.map((msg) => (
            <p key={msg} className="leading-relaxed">
              {msg}
            </p>
          ))}
        </section>
      )}

      {/* Action Feedback Banner */}
      {feedback && (
        <section
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-3xl border p-4 sm:p-5 text-xs flex flex-col gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/40 text-red-100'
              : feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                : 'bg-neonPurple/10 border-neonPurple/40 text-purple-100'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <strong className="text-sm font-bold text-white">{feedback.title}</strong>
              <p className="leading-relaxed">{feedback.message}</p>
              {feedback.prResult && (
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <a
                    href={feedback.prResult.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neonPurple hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <i className="fab fa-github" />
                    <span>Apri PR #{feedback.prResult.prNumber}</span>
                    <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                  </a>
                  {feedback.prResult.vercelPreviewUrl && (
                    <a
                      href={feedback.prResult.vercelPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <span>Vercel Preview</span>
                      <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearFeedback}
              aria-label="Chiudi avviso"
              className="text-gray-400 hover:text-white p-1"
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        </section>
      )}

      {/* Open Pull Requests Panel */}
      {openPrs.length > 0 && (
        <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <i className="fas fa-code-pull-request text-neonPurple text-xs" />
            <span>Pull Request Aperte verso {baseBranch}</span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {openPrs.map((pr) => (
              <div
                key={pr.number}
                className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-emerald-300">
                      PR #{pr.number}
                    </span>
                    <span className="font-bold text-white truncate">{pr.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    <code className="text-purple-300 font-mono">{pr.headRef}</code>
                    <span>•</span>
                    <span>
                      Checks:{' '}
                      <strong
                        className={
                          pr.checkState === 'success'
                            ? 'text-emerald-300'
                            : pr.checkState === 'failure'
                              ? 'text-red-300'
                              : 'text-amber-300'
                        }
                      >
                        {pr.checkState || 'unknown'}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  {pr.vercelPreviewUrl ? (
                    <a
                      href={pr.vercelPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-semibold inline-flex items-center gap-1.5"
                    >
                      <span>Vercel Preview</span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px]" />
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px]">
                      Preview Vercel disponibile nella PR
                    </span>
                  )}
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-full bg-neonPurple hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                  >
                    <span>Apri su GitHub</span>
                    <i className="fas fa-arrow-up-right-from-square text-[9px]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Zod Validation Errors (if any) */}
      {!validation.ok && (
        <section className="rounded-3xl bg-red-500/10 border border-red-500/35 p-5 sm:p-6 flex flex-col gap-3 text-xs">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-red-200 flex items-center gap-2">
            <i className="fas fa-shield-xmark text-red-400" />
            <span>Errori di Validazione Zod</span>
          </h2>
          {Object.entries(validation.errors).map(([filePath, issues]) => (
            <div key={filePath} className="rounded-2xl bg-black/40 border border-red-500/25 p-3.5">
              <code className="text-red-200 font-mono font-bold block mb-1.5">{filePath}</code>
              <ul className="flex flex-col gap-1 text-red-100">
                {issues.map((issue, idx) => (
                  <li key={`${issue.path}-${idx}`}>
                    <code className="text-red-300">[{issue.path}]</code> {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Readable Diff Summary */}
      <section className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <i className="fas fa-file-pen text-neonPurple text-xs" />
            <span>Riepilogo Leggibile Modifiche ({totalPendingDiffs.length})</span>
          </h2>
          {hasLocalUnsaved && (
            <button
              type="button"
              onClick={resetLocalChanges}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white transition-colors"
            >
              Annulla modifiche locali
            </button>
          )}
        </div>

        {snapshotLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">
            <i className="fas fa-circle-notch fa-spin mr-2 text-neonPurple" />
            Caricamento snapshot dal repository in corso...
          </div>
        ) : totalPendingDiffs.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-dashed border-white/15 p-6 text-center text-xs text-gray-400">
            Nessuna modifica rispetto a <code className="text-gray-200">{baseBranch}</code>. Le
            modifiche effettuate nelle tab di editing appariranno qui in formato leggibile prima
            del salvataggio in bozza o dell&apos;apertura della Pull Request.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {totalPendingDiffs.map((fileDiff: FileDiffSummary) => {
              const badge = STATUS_BADGES[fileDiff.status];
              const isOpen = expandedFiles[fileDiff.filePath] ?? true;

              return (
                <div
                  key={fileDiff.filePath}
                  className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFile(fileDiff.filePath)}
                    className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase text-purple-300">
                        {badge.label}
                      </span>
                      <code className="text-xs text-white font-mono truncate">
                        {fileDiff.filePath}
                      </code>
                      <span className="text-[11px] text-gray-400">
                        ({fileDiff.changes.length} campi)
                      </span>
                    </div>
                    <i
                      className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/10 p-3.5 flex flex-col gap-2 text-xs">
                      {fileDiff.changes.map((chg, idx) => (
                        <div
                          key={`${chg.path}-${idx}`}
                          className="rounded-xl bg-black/40 border border-white/5 p-2.5 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-[11px] text-purple-300 font-mono break-all">
                              {chg.path}
                            </code>
                            <span className="text-[10px] uppercase font-bold text-gray-400">
                              {chg.kind}
                            </span>
                          </div>
                          {chg.before !== undefined && (
                            <div className="text-[11px] text-red-300/90 break-words">
                              <span className="font-semibold text-red-400">Prima: </span>
                              {chg.before}
                            </div>
                          )}
                          {chg.after !== undefined && (
                            <div className="text-[11px] text-emerald-300/90 break-words">
                              <span className="font-semibold text-emerald-400">Dopo: </span>
                              {chg.after}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pendingAssetList.length > 0 && (
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              Asset Immagini in Coda ({pendingAssetList.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingAssetList.map((asset) => (
                <div
                  key={asset.path}
                  className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={asset.previewDataUrl}
                      alt={asset.path}
                      className="w-12 h-12 rounded-xl object-cover border border-white/15 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <code className="text-[11px] text-white font-mono block truncate">
                        {asset.path}
                      </code>
                      <span className="text-[10px] text-emerald-300">
                        Compresso • pronto per upload atomico
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => unstageBinaryAsset(asset.path)}
                    title="Rimuovi immagine dalla coda"
                    className="px-2.5 py-1 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-200 text-[10px] font-bold"
                  >
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Two Distinct Actions: 1) Save Draft, 2) Publish PR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Action 1: Save Temporarily (Draft) */}
        <form
          onSubmit={handleSaveDraft}
          className="rounded-3xl bg-[#0a0a0c]/85 border border-white/10 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4"
        >
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Salva Temporaneamente (Bozza)
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Salva su branch <code className="text-purple-300">draft/*</code> senza aprire PR.
                Utile per testare la Vercel Preview della bozza o continuare da un altro dispositivo.
              </p>
            </div>

            {!isWorkingOnDraft && (
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="draft-title-input"
                  className="text-[11px] font-semibold uppercase tracking-wider text-gray-300"
                >
                  Nome bozza (opzionale)
                </label>
                <input
                  id="draft-title-input"
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="es. serata-trento-maggio"
                  className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-neonPurple focus:outline-none px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label
                htmlFor="draft-message-input"
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-300"
              >
                Note commit bozza (opzionale)
              </label>
              <input
                id="draft-message-input"
                type="text"
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="es. Aggiornata tracklist e note evento"
                className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-neonPurple focus:outline-none px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSaveDraft}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 disabled:opacity-45 disabled:cursor-not-allowed text-amber-100 text-xs font-bold uppercase tracking-wider py-3 px-4 transition-all"
            >
              {savingDraft ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs" />
                  <span>Salvataggio bozza...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk text-xs" />
                  <span>Salva Temporaneamente (Bozza)</span>
                </>
              )}
            </button>

            {isWorkingOnDraft && (
              <button
                type="button"
                disabled={discardingDraft || publishing || savingDraft}
                onClick={() => void discardActiveDraft()}
                title="Archivia con tag ed elimina la bozza"
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 text-red-200 text-xs font-bold uppercase tracking-wider py-3 px-3.5 transition-all"
              >
                <i className="fas fa-box-archive text-xs" />
                <span>Scarta</span>
              </button>
            )}
          </div>
        </form>

        {/* Action 2: Publish (Open / Update Pull Request) */}
        <form
          onSubmit={handlePublish}
          className="rounded-3xl bg-[#0a0a0c]/85 border border-neonPurple/35 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4"
        >
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Salva Definitivamente (Richiedi Pubblicazione)
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Valida tutti i JSON con Zod, finalizza il commit e apre (o aggiorna) la Pull
                Request verso <code className="text-purple-300">{baseBranch}</code>.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="pr-title-input"
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-300"
              >
                Titolo Pull Request (opzionale)
              </label>
              <input
                id="pr-title-input"
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="es. CMS: Aggiornamento eventi e link ufficiali"
                className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-neonPurple focus:outline-none px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="pr-notes-input"
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-300"
              >
                Note per la revisione (opzionale)
              </label>
              <textarea
                id="pr-notes-input"
                rows={2}
                value={prNotes}
                onChange={(e) => setPrNotes(e.target.value)}
                placeholder="Note sintetiche incluse nella descrizione della PR..."
                className="w-full rounded-2xl bg-black/60 border border-white/15 focus:border-neonPurple focus:outline-none px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canPublish}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neonPurple hover:bg-purple-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider py-3.5 px-5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          >
            {publishing ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-xs" />
                <span>Apertura Pull Request...</span>
              </>
            ) : (
              <>
                <i className="fas fa-code-pull-request text-xs" />
                <span>Salva Definitivamente (Richiedi Pubblicazione)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
