import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  ContentSnapshot,
  DiscardDraftResult,
  DraftStatusResponse,
  PublishDraftResult,
  SaveDraftResult,
} from '../../lib/cmsTypes';
import {
  buildSnapshotOperations,
  computeReadableDiff,
  type FileDiffSummary,
} from '../../lib/diff';
import {
  validateSnapshotFiles,
  type ValidationIssue,
} from '../../lib/contentValidation';
import type { AiAssistAction, AiAssistContext } from '../../lib/gemini';
import type { SiteLinks } from '../../schemas/siteLinks';

export interface AdminDashboardStats {
  eventsCount: number;
  eventsWithoutTracklist: number;
  tracklistsCount: number;
  totalTracksCount: number;
  demosCount: number;
  liveSetsCount: number;
  techPackagesCount: number;
  framingCardsCount: number;
}

export interface PendingBinaryAsset {
  path: string;
  base64: string;
  previewDataUrl: string;
  mimeType: string;
}

export interface WorkspaceFeedback {
  type: 'success' | 'info' | 'error';
  title: string;
  message: string;
  prResult?: PublishDraftResult;
  archiveTag?: string;
}

interface AdminWorkspaceContextValue {
  githubConfigured: boolean;
  baseBranch: string;
  missingEnv: string[];
  draftStatus: DraftStatusResponse | null;
  statusLoading: boolean;
  snapshotLoading: boolean;
  savingDraft: boolean;
  discardingDraft: boolean;
  publishing: boolean;
  showDraftPrompt: boolean;
  activeBranch: string;
  baselineSnapshot: Record<string, unknown>;
  remoteDraftSnapshot: Record<string, unknown> | null;
  workingSnapshot: Record<string, unknown>;
  pendingAssets: Record<string, PendingBinaryAsset>;
  committedDraftAssets: Record<string, PendingBinaryAsset>;
  localUnsavedDiffs: FileDiffSummary[];
  totalPendingDiffs: FileDiffSummary[];
  hasAnyPendingBinary: boolean;
  validation: { ok: boolean; errors: Record<string, ValidationIssue[]> };
  stats: AdminDashboardStats;
  siteLinks: SiteLinks;
  feedback: WorkspaceFeedback | null;
  aiRateLimitedUntil: number | null;
  aiDisabledReason: string | null;
  aiIsBlocked: boolean;
  clearAiNotice: () => void;
  requestAiAssist: (
    action: AiAssistAction,
    text: string,
    context?: AiAssistContext
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
  clearFeedback: () => void;
  refreshStatus: () => Promise<void>;
  resumeDraft: () => Promise<void>;
  discardActiveDraft: () => Promise<void>;
  updateContentFile: (filePath: string, data: unknown) => void;
  deleteContentFile: (filePath: string) => void;
  stageBinaryAsset: (asset: PendingBinaryAsset) => void;
  unstageBinaryAsset: (assetPath: string) => void;
  resetLocalChanges: () => void;
  saveAsDraft: (options?: { draftTitle?: string; message?: string }) => Promise<SaveDraftResult | null>;
  publishToMain: (options?: { title?: string; notes?: string }) => Promise<PublishDraftResult | null>;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

function cloneRecord(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

function computeStatsFromSnapshot(
  files: Record<string, unknown>,
  fallback: AdminDashboardStats
): AdminDashboardStats {
  const keys = Object.keys(files);
  if (keys.length === 0) return fallback;

  const eventKeys = keys.filter((k) => k.startsWith('src/content/events/') && k.endsWith('.json'));
  const eventsWithoutTracklist = eventKeys.filter((k) => {
    const ev = files[k] as { tracklist?: unknown[] } | undefined;
    return !ev || !Array.isArray(ev.tracklist) || ev.tracklist.length === 0;
  }).length;

  const tracklistKeys = keys.filter(
    (k) => k.startsWith('src/content/tracklists/') && k.endsWith('.json')
  );
  const totalTracksCount = tracklistKeys.reduce((acc, k) => {
    const tl = files[k] as { tracks?: unknown[] } | undefined;
    return acc + (Array.isArray(tl?.tracks) ? tl.tracks.length : 0);
  }, 0);

  const demos = files['src/data/demos.json'];
  const liveSets = files['src/data/liveSets.json'];
  const techSide = files['src/data/techSide.json'] as { techPackages?: unknown[] } | undefined;
  const framing = files['src/data/imageFraming.json'] as Record<string, unknown> | undefined;

  return {
    eventsCount: eventKeys.length,
    eventsWithoutTracklist,
    tracklistsCount: tracklistKeys.length,
    totalTracksCount,
    demosCount: Array.isArray(demos) ? demos.length : fallback.demosCount,
    liveSetsCount: Array.isArray(liveSets) ? liveSets.length : fallback.liveSetsCount,
    techPackagesCount: Array.isArray(techSide?.techPackages)
      ? techSide.techPackages.length
      : fallback.techPackagesCount,
    framingCardsCount:
      framing && typeof framing === 'object'
        ? Object.keys(framing).length
        : fallback.framingCardsCount,
  };
}

interface ProviderProps {
  fallbackStats: AdminDashboardStats;
  fallbackSiteLinks: SiteLinks;
  fallbackSnapshot?: Record<string, unknown>;
  children: React.ReactNode;
}

export const AdminWorkspaceProvider: React.FC<ProviderProps> = ({
  fallbackStats,
  fallbackSiteLinks,
  fallbackSnapshot = {},
  children,
}) => {
  const [githubConfigured, setGithubConfigured] = useState(true);
  const [baseBranch, setBaseBranch] = useState('main');
  const [missingEnv, setMissingEnv] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<DraftStatusResponse | null>(null);

  const [statusLoading, setStatusLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [activeBranch, setActiveBranch] = useState('main');
  const [baselineSnapshot, setBaselineSnapshot] = useState<Record<string, unknown>>(() =>
    cloneRecord(fallbackSnapshot)
  );
  const [remoteDraftSnapshot, setRemoteDraftSnapshot] = useState<Record<string, unknown> | null>(
    null
  );
  const [workingSnapshot, setWorkingSnapshot] = useState<Record<string, unknown>>(() =>
    cloneRecord(fallbackSnapshot)
  );
  const [pendingAssets, setPendingAssets] = useState<Record<string, PendingBinaryAsset>>({});
  const [committedDraftAssets, setCommittedDraftAssets] = useState<
    Record<string, PendingBinaryAsset>
  >({});
  const [feedback, setFeedback] = useState<WorkspaceFeedback | null>(null);

  // Global AI quota / configuration state
  const [aiRateLimitedUntil, setAiRateLimitedUntil] = useState<number | null>(null);
  const [aiDisabledReason, setAiDisabledReason] = useState<string | null>(null);

  const aiIsBlocked = useMemo(() => {
    if (aiRateLimitedUntil && Date.now() < aiRateLimitedUntil) return true;
    return Boolean(aiDisabledReason);
  }, [aiDisabledReason, aiRateLimitedUntil]);

  useEffect(() => {
    if (!aiRateLimitedUntil) return;
    const remaining = aiRateLimitedUntil - Date.now();
    if (remaining <= 0) {
      setAiRateLimitedUntil(null);
      setAiDisabledReason(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setAiRateLimitedUntil(null);
      setAiDisabledReason(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [aiRateLimitedUntil]);

  const clearAiNotice = useCallback(() => {
    setAiRateLimitedUntil(null);
    setAiDisabledReason(null);
  }, []);

  const requestAiAssist = useCallback(
    async (
      action: AiAssistAction,
      text: string,
      context: AiAssistContext = 'general'
    ): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
      if (!text.trim()) {
        return { ok: false, error: 'Inserisci prima del testo in italiano.' };
      }
      if (aiRateLimitedUntil && Date.now() < aiRateLimitedUntil) {
        const secs = Math.ceil((aiRateLimitedUntil - Date.now()) / 1000);
        return {
          ok: false,
          error: `AI temporaneamente in pausa per limite quota (riprova tra ${secs}s). Puoi comunque modificare manualmente.`,
        };
      }

      try {
        const res = await fetch('/api/admin/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, text, context }),
        });

        const payload = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          text?: string;
          code?: string;
          retryAfterSeconds?: number;
          error?: string;
        };

        if (res.status === 429 || payload.code === 'RATE_LIMIT') {
          const retrySecs = payload.retryAfterSeconds ?? 60;
          setAiRateLimitedUntil(Date.now() + retrySecs * 1000);
          setAiDisabledReason(
            payload.error ||
              `Quota Gemini temporaneamente esaurita (429). Puoi continuare a scrivere e pubblicare manualmente.`
          );
          return {
            ok: false,
            error: payload.error || 'Limite quota AI raggiunto (429).',
          };
        }

        if (res.status === 503 || payload.code === 'NOT_CONFIGURED') {
          setAiDisabledReason(
            payload.error ||
              'GEMINI_API_KEY non configurata: assistente AI disabilitato (editing manuale sempre attivo).'
          );
          return {
            ok: false,
            error: payload.error || 'GEMINI_API_KEY non configurata.',
          };
        }

        if (!res.ok || !payload.ok || !payload.text) {
          return { ok: false, error: payload.error || 'Errore risposta assistente AI.' };
        }

        return { ok: true, text: payload.text };
      } catch {
        return { ok: false, error: 'Impossibile raggiungere /api/admin/ai/assist.' };
      }
    },
    [aiRateLimitedUntil]
  );

  const fetchSnapshot = useCallback(async (ref: string): Promise<ContentSnapshot> => {
    const res = await fetch(`/api/admin/draft/load?ref=${encodeURIComponent(ref)}`);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      snapshot?: ContentSnapshot;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.snapshot) {
      throw new Error(data.error || `Impossibile caricare lo snapshot da "${ref}"`);
    }
    return data.snapshot;
  }, []);

  const refreshStatusOnly = useCallback(async (): Promise<DraftStatusResponse | null> => {
    const res = await fetch('/api/admin/draft/status');
    const data = (await res.json().catch(() => ({}))) as DraftStatusResponse & {
      error?: string;
    };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Impossibile recuperare lo stato delle bozze GitHub.');
    }
    setGithubConfigured(data.configured);
    setBaseBranch(data.baseBranch || 'main');
    setMissingEnv(data.missingEnv || []);
    setDraftStatus(data);
    return data;
  }, []);

  const initializeWorkspace = useCallback(async () => {
    setStatusLoading(true);
    setFeedback(null);
    try {
      const status = await refreshStatusOnly();
      if (!status || !status.configured) {
        return;
      }

      setSnapshotLoading(true);
      const baseSnap = await fetchSnapshot(status.baseBranch);
      setBaselineSnapshot(baseSnap.files);

      if (status.activeDraft) {
        setShowDraftPrompt(true);
        setActiveBranch(status.baseBranch);
        setRemoteDraftSnapshot(null);
        setWorkingSnapshot(cloneRecord(baseSnap.files));
      } else {
        setShowDraftPrompt(false);
        setActiveBranch(status.baseBranch);
        setRemoteDraftSnapshot(null);
        setWorkingSnapshot(cloneRecord(baseSnap.files));
      }
      setPendingAssets({});
      setCommittedDraftAssets({});
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Errore caricamento workspace GitHub',
        message: err instanceof Error ? err.message : 'Errore imprevisto.',
      });
    } finally {
      setStatusLoading(false);
      setSnapshotLoading(false);
    }
  }, [fetchSnapshot, refreshStatusOnly]);

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      await refreshStatusOnly();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Aggiornamento stato fallito',
        message: err instanceof Error ? err.message : 'Errore di rete.',
      });
    } finally {
      setStatusLoading(false);
    }
  }, [refreshStatusOnly]);

  const resumeDraft = useCallback(async () => {
    const draftBranch = draftStatus?.activeDraft?.branch;
    if (!draftBranch) {
      setShowDraftPrompt(false);
      return;
    }

    setSnapshotLoading(true);
    setFeedback(null);
    try {
      const draftSnap = await fetchSnapshot(draftBranch);
      setActiveBranch(draftBranch);
      setRemoteDraftSnapshot(draftSnap.files);
      setWorkingSnapshot(cloneRecord(draftSnap.files));
      setPendingAssets({});
      setShowDraftPrompt(false);
      setFeedback({
        type: 'info',
        title: 'Bozza ripresa',
        message: `Stai lavorando sulla branch "${draftBranch}". Tutte le modifiche rispetto a "${baseBranch}" sono pronte per essere modificate o pubblicate.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Impossibile caricare la bozza',
        message: err instanceof Error ? err.message : 'Errore sconosciuto.',
      });
    } finally {
      setSnapshotLoading(false);
    }
  }, [baseBranch, draftStatus?.activeDraft?.branch, fetchSnapshot]);

  const discardActiveDraft = useCallback(async () => {
    const draftBranch = draftStatus?.activeDraft?.branch;
    if (!draftBranch) {
      setShowDraftPrompt(false);
      return;
    }

    setDiscardingDraft(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/draft/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: draftBranch }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<DiscardDraftResult> & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Impossibile scartare la bozza.');
      }

      await refreshStatusOnly();
      setActiveBranch(baseBranch);
      setRemoteDraftSnapshot(null);
      setWorkingSnapshot(cloneRecord(baselineSnapshot));
      setPendingAssets({});
      setCommittedDraftAssets({});
      setShowDraftPrompt(false);
      setFeedback({
        type: 'info',
        title: 'Bozza archiviata e scartata',
        message: `Branch "${draftBranch}" archiviata nel tag "${data.archiveTag}" ed eliminata. Workspace ripristinato su "${baseBranch}".`,
        archiveTag: data.archiveTag,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Errore scarto bozza',
        message: err instanceof Error ? err.message : 'Errore imprevisto.',
      });
    } finally {
      setDiscardingDraft(false);
    }
  }, [baseBranch, baselineSnapshot, draftStatus?.activeDraft?.branch, refreshStatusOnly]);

  const updateContentFile = useCallback((filePath: string, data: unknown) => {
    setWorkingSnapshot((prev) => ({
      ...prev,
      [filePath]: data,
    }));
  }, []);

  const deleteContentFile = useCallback((filePath: string) => {
    setWorkingSnapshot((prev) => {
      const next = { ...prev };
      delete next[filePath];
      return next;
    });
  }, []);

  const stageBinaryAsset = useCallback((asset: PendingBinaryAsset) => {
    setPendingAssets((prev) => ({
      ...prev,
      [asset.path]: asset,
    }));
  }, []);

  const unstageBinaryAsset = useCallback((assetPath: string) => {
    setPendingAssets((prev) => {
      const next = { ...prev };
      delete next[assetPath];
      return next;
    });
  }, []);

  const resetLocalChanges = useCallback(() => {
    const origin = remoteDraftSnapshot ?? baselineSnapshot;
    setWorkingSnapshot(cloneRecord(origin));
    setPendingAssets({});
    setFeedback({
      type: 'info',
      title: 'Modifiche locali annullate',
      message: 'Ripristinato lo stato remoto della branch corrente.',
    });
  }, [baselineSnapshot, remoteDraftSnapshot]);

  const localUnsavedDiffs = useMemo(
    () => computeReadableDiff(remoteDraftSnapshot ?? baselineSnapshot, workingSnapshot),
    [baselineSnapshot, remoteDraftSnapshot, workingSnapshot]
  );

  const totalPendingDiffs = useMemo(
    () => computeReadableDiff(baselineSnapshot, workingSnapshot),
    [baselineSnapshot, workingSnapshot]
  );

  const hasAnyPendingBinary = Object.keys(pendingAssets).length > 0;

  const validation = useMemo(
    () => validateSnapshotFiles(workingSnapshot),
    [workingSnapshot]
  );

  useEffect(() => {
    if (localUnsavedDiffs.length === 0 && !hasAnyPendingBinary) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyPendingBinary, localUnsavedDiffs.length]);

  const saveAsDraft = useCallback(
    async (options?: { draftTitle?: string; message?: string }): Promise<SaveDraftResult | null> => {
      const baseForSave = remoteDraftSnapshot ?? baselineSnapshot;
      const ops = buildSnapshotOperations(baseForSave, workingSnapshot);
      const binaryUpserts = Object.values(pendingAssets).map((a) => ({
        path: a.path,
        contentBase64: a.base64,
      }));

      if (ops.upserts.length === 0 && ops.deletes.length === 0 && binaryUpserts.length === 0) {
        setFeedback({
          type: 'info',
          title: 'Nessuna nuova modifica locale',
          message: 'Le modifiche risultano già salvate nella bozza corrente.',
        });
        return null;
      }

      if (!validation.ok) {
        setFeedback({
          type: 'error',
          title: 'Validazione Zod non superata',
          message: 'Correggi gli errori nei JSON prima di salvare la bozza.',
        });
        return null;
      }

      setSavingDraft(true);
      setFeedback(null);
      try {
        const res = await fetch('/api/admin/draft/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch: activeBranch.startsWith('draft/') ? activeBranch : undefined,
            draftTitle: options?.draftTitle,
            message: options?.message,
            upserts: ops.upserts,
            deletes: ops.deletes,
            binaryUpserts,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<SaveDraftResult> & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.branch || !data.commitSha) {
          throw new Error(data.error || 'Errore durante il salvataggio della bozza.');
        }

        setActiveBranch(data.branch);
        setRemoteDraftSnapshot(cloneRecord(workingSnapshot));
        setCommittedDraftAssets((prev) => ({ ...prev, ...pendingAssets }));
        setPendingAssets({});
        await refreshStatusOnly();
        setFeedback({
          type: 'success',
          title: 'Bozza salvata su GitHub',
          message: `Commit ${data.commitSha.slice(0, 7)} salvato sulla branch "${data.branch}".`,
        });

        return {
          branch: data.branch,
          commitSha: data.commitSha,
          message: data.message || '',
        };
      } catch (err) {
        setFeedback({
          type: 'error',
          title: 'Salvataggio bozza fallito',
          message: err instanceof Error ? err.message : 'Errore imprevisto.',
        });
        return null;
      } finally {
        setSavingDraft(false);
      }
    },
    [
      activeBranch,
      baselineSnapshot,
      pendingAssets,
      refreshStatusOnly,
      remoteDraftSnapshot,
      validation.ok,
      workingSnapshot,
    ]
  );

  const publishToMain = useCallback(
    async (options?: { title?: string; notes?: string }): Promise<PublishDraftResult | null> => {
      if (!validation.ok) {
        setFeedback({
          type: 'error',
          title: 'Validazione Zod non superata',
          message: 'Impossibile aprire la Pull Request con dati non validi.',
        });
        return null;
      }

      const baseForCommit = remoteDraftSnapshot ?? baselineSnapshot;
      const ops = buildSnapshotOperations(baseForCommit, workingSnapshot);
      const binaryUpserts = Object.values(pendingAssets).map((a) => ({
        path: a.path,
        contentBase64: a.base64,
      }));
      const isExistingDraft = activeBranch.startsWith('draft/');

      if (
        !isExistingDraft &&
        ops.upserts.length === 0 &&
        ops.deletes.length === 0 &&
        binaryUpserts.length === 0
      ) {
        setFeedback({
          type: 'info',
          title: 'Nessuna modifica da pubblicare',
          message: 'Apporta almeno una modifica prima di richiedere la pubblicazione.',
        });
        return null;
      }

      setPublishing(true);
      setFeedback(null);
      try {
        const res = await fetch('/api/admin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch: isExistingDraft ? activeBranch : undefined,
            title: options?.title,
            notes: options?.notes,
            upserts: ops.upserts,
            deletes: ops.deletes,
            binaryUpserts,
            diffSummary: totalPendingDiffs.map((d) => ({
              path: d.filePath,
              status: d.status,
              changesCount: d.changes.length,
            })),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<PublishDraftResult> & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.prUrl || !data.prNumber || !data.branch) {
          throw new Error(data.error || 'Errore durante la creazione della Pull Request.');
        }

        const prResult: PublishDraftResult = {
          prNumber: data.prNumber,
          prUrl: data.prUrl,
          branch: data.branch,
          commitSha: data.commitSha || '',
          prState: data.prState || 'open',
          checkState: data.checkState || 'unknown',
          vercelPreviewUrl: data.vercelPreviewUrl ?? null,
          updatedExisting: Boolean(data.updatedExisting),
        };

        setActiveBranch(data.branch);
        setRemoteDraftSnapshot(cloneRecord(workingSnapshot));
        setCommittedDraftAssets((prev) => ({ ...prev, ...pendingAssets }));
        setPendingAssets({});
        await refreshStatusOnly();

        setFeedback({
          type: 'success',
          title: prResult.updatedExisting
            ? `Pull Request #${prResult.prNumber} aggiornata`
            : `Pull Request #${prResult.prNumber} aperta verso ${baseBranch}`,
          message: `La revisione è pronta su GitHub (${prResult.branch} -> ${baseBranch}).`,
          prResult,
        });

        return prResult;
      } catch (err) {
        setFeedback({
          type: 'error',
          title: 'Pubblicazione fallita',
          message: err instanceof Error ? err.message : 'Errore imprevisto.',
        });
        return null;
      } finally {
        setPublishing(false);
      }
    },
    [
      activeBranch,
      baseBranch,
      baselineSnapshot,
      pendingAssets,
      refreshStatusOnly,
      remoteDraftSnapshot,
      totalPendingDiffs,
      validation.ok,
      workingSnapshot,
    ]
  );

  const stats = useMemo(
    () => computeStatsFromSnapshot(workingSnapshot, fallbackStats),
    [fallbackStats, workingSnapshot]
  );

  const siteLinks = useMemo(() => {
    const liveLinks = workingSnapshot['src/data/siteLinks.json'];
    if (liveLinks && typeof liveLinks === 'object') {
      return liveLinks as SiteLinks;
    }
    return fallbackSiteLinks;
  }, [fallbackSiteLinks, workingSnapshot]);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const value: AdminWorkspaceContextValue = {
    githubConfigured,
    baseBranch,
    missingEnv,
    draftStatus,
    statusLoading,
    snapshotLoading,
    savingDraft,
    discardingDraft,
    publishing,
    showDraftPrompt,
    activeBranch,
    baselineSnapshot,
    remoteDraftSnapshot,
    workingSnapshot,
    pendingAssets,
    committedDraftAssets,
    localUnsavedDiffs,
    totalPendingDiffs,
    hasAnyPendingBinary,
    validation,
    stats,
    siteLinks,
    feedback,
    aiRateLimitedUntil,
    aiDisabledReason,
    aiIsBlocked,
    clearAiNotice,
    requestAiAssist,
    clearFeedback,
    refreshStatus,
    resumeDraft,
    discardActiveDraft,
    updateContentFile,
    deleteContentFile,
    stageBinaryAsset,
    unstageBinaryAsset,
    resetLocalChanges,
    saveAsDraft,
    publishToMain,
  };

  return (
    <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>
  );
};

export function useAdminWorkspace(): AdminWorkspaceContextValue {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) {
    throw new Error('useAdminWorkspace must be used inside AdminWorkspaceProvider');
  }
  return ctx;
}
