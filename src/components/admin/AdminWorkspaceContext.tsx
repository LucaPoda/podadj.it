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
  localUnsavedDiffs: FileDiffSummary[];
  totalPendingDiffs: FileDiffSummary[];
  validation: { ok: boolean; errors: Record<string, ValidationIssue[]> };
  stats: AdminDashboardStats;
  siteLinks: SiteLinks;
  feedback: WorkspaceFeedback | null;
  clearFeedback: () => void;
  refreshStatus: () => Promise<void>;
  resumeDraft: () => Promise<void>;
  discardActiveDraft: () => Promise<void>;
  updateContentFile: (filePath: string, data: unknown) => void;
  deleteContentFile: (filePath: string) => void;
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
  children: React.ReactNode;
}

export const AdminWorkspaceProvider: React.FC<ProviderProps> = ({
  fallbackStats,
  fallbackSiteLinks,
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
  const [baselineSnapshot, setBaselineSnapshot] = useState<Record<string, unknown>>({});
  const [remoteDraftSnapshot, setRemoteDraftSnapshot] = useState<Record<string, unknown> | null>(
    null
  );
  const [workingSnapshot, setWorkingSnapshot] = useState<Record<string, unknown>>({});
  const [feedback, setFeedback] = useState<WorkspaceFeedback | null>(null);

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

  const resetLocalChanges = useCallback(() => {
    const origin = remoteDraftSnapshot ?? baselineSnapshot;
    setWorkingSnapshot(cloneRecord(origin));
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

  const validation = useMemo(
    () => validateSnapshotFiles(workingSnapshot),
    [workingSnapshot]
  );

  useEffect(() => {
    if (localUnsavedDiffs.length === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [localUnsavedDiffs.length]);

  const saveAsDraft = useCallback(
    async (options?: { draftTitle?: string; message?: string }): Promise<SaveDraftResult | null> => {
      const baseForSave = remoteDraftSnapshot ?? baselineSnapshot;
      const ops = buildSnapshotOperations(baseForSave, workingSnapshot);

      if (ops.upserts.length === 0 && ops.deletes.length === 0) {
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
      const isExistingDraft = activeBranch.startsWith('draft/');

      if (!isExistingDraft && ops.upserts.length === 0 && ops.deletes.length === 0) {
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
    localUnsavedDiffs,
    totalPendingDiffs,
    validation,
    stats,
    siteLinks,
    feedback,
    clearFeedback,
    refreshStatus,
    resumeDraft,
    discardActiveDraft,
    updateContentFile,
    deleteContentFile,
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
