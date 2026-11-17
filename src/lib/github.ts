import type {
  AtomicFileUpsert,
  ContentSnapshot,
  DiscardDraftResult,
  DraftBranchInfo,
  DraftStatusResponse,
  PublishDraftResult,
  PullRequestSummary,
  SaveDraftResult,
} from './cmsTypes';
import {
  formatCanonicalJson,
  isAllowedBinaryAssetPath,
  isAllowedContentPath,
  isAllowedRepoWritePath,
  isEditableTreeJsonPath,
  validateContentFile,
} from './contentValidation';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
}

export class GitHubConfigError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`Missing GitHub environment variable(s): ${missing.join(', ')}`);
    this.name = 'GitHubConfigError';
    this.missing = missing;
  }
}

export class GitHubApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.details = details;
  }
}

type FetchLike = typeof fetch;

function readEnvVar(name: 'GITHUB_TOKEN' | 'GITHUB_OWNER' | 'GITHUB_REPO' | 'GITHUB_BASE_BRANCH'): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
  const value = (fromProcess ?? fromImportMeta ?? '').trim();
  return value.length > 0 ? value : undefined;
}

export function getMissingGitHubEnvVars(): string[] {
  const missing: string[] = [];
  if (!readEnvVar('GITHUB_TOKEN')) missing.push('GITHUB_TOKEN');
  if (!readEnvVar('GITHUB_OWNER')) missing.push('GITHUB_OWNER');
  if (!readEnvVar('GITHUB_REPO')) missing.push('GITHUB_REPO');
  return missing;
}

export function getGitHubConfig(): GitHubConfig {
  const missing = getMissingGitHubEnvVars();
  if (missing.length > 0) {
    throw new GitHubConfigError(missing);
  }
  return {
    token: readEnvVar('GITHUB_TOKEN')!,
    owner: readEnvVar('GITHUB_OWNER')!,
    repo: readEnvVar('GITHUB_REPO')!,
    baseBranch: readEnvVar('GITHUB_BASE_BRANCH') || 'main',
  };
}

export function getBaseBranchFallback(): string {
  return readEnvVar('GITHUB_BASE_BRANCH') || 'main';
}

function encodeRefPath(ref: string): string {
  return ref
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function slugify(input: string, fallback = 'update'): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned || fallback;
}

function formatTimestampCompact(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '-',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('');
}

function isSafeDraftBranch(branch: string): boolean {
  return /^draft\/[a-zA-Z0-9._/-]+$/.test(branch) && !branch.includes('..');
}

function isSafePublishBranch(branch: string): boolean {
  return (
    /^(draft|publish|cms)\/[a-zA-Z0-9._/-]+$/.test(branch) &&
    !branch.includes('..')
  );
}

export function isAllowedSnapshotRef(ref: string, baseBranch: string): boolean {
  if (!ref || ref.includes('..')) return false;
  if (ref === baseBranch) return true;
  return isSafeDraftBranch(ref);
}

async function githubRequest<T>(
  config: GitHubConfig,
  apiPath: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch
): Promise<T> {
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${apiPath}`;
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'podadj-it-admin-cms',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const ghMessage =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `GitHub API error (${response.status})`;
    throw new GitHubApiError(response.status, ghMessage, parsed);
  }

  return parsed as T;
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

interface GitHubRefItem {
  ref: string;
  object: {
    sha: string;
    type: string;
  };
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      date?: string;
    } | null;
    committer?: {
      date?: string;
    } | null;
  };
  author?: {
    login?: string;
  } | null;
}

interface GitHubPullRaw {
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  mergeable_state?: string | null;
  updated_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
}

interface GitHubCombinedStatus {
  state?: 'success' | 'pending' | 'failure' | 'error';
  statuses?: Array<{
    context?: string;
    state?: string;
    target_url?: string | null;
  }>;
}

interface GitHubCheckRunsResponse {
  check_runs?: Array<{
    name?: string;
    status?: string;
    conclusion?: string | null;
    details_url?: string | null;
  }>;
}

async function enrichPullRequestSummary(
  config: GitHubConfig,
  pr: GitHubPullRaw,
  fetchImpl: FetchLike
): Promise<PullRequestSummary> {
  let checkState: PullRequestSummary['checkState'] = 'unknown';
  let vercelPreviewUrl: string | null = null;

  try {
    const statusRes = await githubRequest<GitHubCombinedStatus>(
      config,
      `/commits/${encodeURIComponent(pr.head.sha)}/status`,
      {},
      fetchImpl
    );

    if (statusRes?.state === 'success') checkState = 'success';
    else if (statusRes?.state === 'pending') checkState = 'pending';
    else if (statusRes?.state === 'failure' || statusRes?.state === 'error') checkState = 'failure';

    const vercelStatus = statusRes?.statuses?.find(
      (s) =>
        (s.context?.toLowerCase().includes('vercel') ||
          s.target_url?.toLowerCase().includes('vercel.app')) &&
        Boolean(s.target_url)
    );
    if (vercelStatus?.target_url) {
      vercelPreviewUrl = vercelStatus.target_url;
    }
  } catch {
    // Token might not have commit status read permissions; degrade gracefully
  }

  if (checkState === 'unknown' || !vercelPreviewUrl) {
    try {
      const checksRes = await githubRequest<GitHubCheckRunsResponse>(
        config,
        `/commits/${encodeURIComponent(pr.head.sha)}/check-runs`,
        {},
        fetchImpl
      );
      const runs = checksRes?.check_runs || [];
      if (runs.length > 0) {
        if (runs.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out' || r.conclusion === 'cancelled')) {
          checkState = 'failure';
        } else if (runs.some((r) => r.status !== 'completed')) {
          checkState = 'pending';
        } else if (runs.every((r) => r.conclusion === 'success' || r.conclusion === 'neutral' || r.conclusion === 'skipped')) {
          checkState = 'success';
        }
        if (!vercelPreviewUrl) {
          const vercelRun = runs.find(
            (r) =>
              (r.name?.toLowerCase().includes('vercel') ||
                r.details_url?.toLowerCase().includes('vercel.app')) &&
              Boolean(r.details_url)
          );
          if (vercelRun?.details_url) {
            vercelPreviewUrl = vercelRun.details_url;
          }
        }
      }
    } catch {
      // Optional check-runs scope
    }
  }

  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state: pr.state,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    headSha: pr.head.sha,
    draft: Boolean(pr.draft),
    mergeableState: pr.mergeable_state ?? null,
    checkState,
    vercelPreviewUrl,
    updatedAt: pr.updated_at,
  };
}

export async function listDraftRefs(
  config: GitHubConfig,
  fetchImpl: FetchLike = fetch
): Promise<Array<{ branch: string; ref: string; sha: string }>> {
  const refs = await githubRequest<GitHubRefItem[]>(
    config,
    '/git/matching-refs/heads/draft/',
    {},
    fetchImpl
  );

  return (Array.isArray(refs) ? refs : [])
    .filter((item) => item.ref.startsWith('refs/heads/draft/'))
    .map((item) => ({
      branch: item.ref.slice('refs/heads/'.length),
      ref: item.ref,
      sha: item.object.sha,
    }));
}

export async function getDraftStatus(
  config: GitHubConfig,
  fetchImpl: FetchLike = fetch
): Promise<DraftStatusResponse> {
  const [draftRefs, openPullsRaw] = await Promise.all([
    listDraftRefs(config, fetchImpl),
    githubRequest<GitHubPullRaw[]>(
      config,
      `/pulls?state=open&base=${encodeURIComponent(config.baseBranch)}&per_page=20`,
      {},
      fetchImpl
    ),
  ]);

  const openPullRequests = await mapInBatches(openPullsRaw || [], 5, (pr) =>
    enrichPullRequestSummary(config, pr, fetchImpl)
  );

  const anomalies: string[] = [];
  let activeDraft: DraftBranchInfo | null = null;

  if (draftRefs.length > 0) {
    if (draftRefs.length > 1) {
      anomalies.push(
        `Rilevate ${draftRefs.length} branch draft/* attive contemporaneamente (${draftRefs
          .map((d) => d.branch)
          .join(', ')}). Il portale supporta una sola bozza attiva: usa quella più recente o scarta quelle residue.`
      );
    }

    const withCommits = await mapInBatches(draftRefs, 4, async (d) => {
      const commitData = await githubRequest<GitHubCommitResponse>(
        config,
        `/commits/${encodeURIComponent(d.sha)}`,
        {},
        fetchImpl
      );
      return {
        ...d,
        commit: {
          sha: commitData.sha,
          message: commitData.commit.message,
          date: commitData.commit.author?.date || commitData.commit.committer?.date || '',
          author:
            commitData.author?.login ||
            commitData.commit.author?.name ||
            'PODA Admin',
        },
      };
    });

    withCommits.sort((a, b) => {
      const ta = Date.parse(a.commit.date || '') || 0;
      const tb = Date.parse(b.commit.date || '') || 0;
      return tb - ta;
    });

    const latest = withCommits[0];
    const matchingPr =
      openPullRequests.find((pr) => pr.headRef === latest.branch) || null;

    activeDraft = {
      branch: latest.branch,
      ref: latest.ref,
      sha: latest.sha,
      commit: latest.commit,
      openPr: matchingPr,
    };
  }

  return {
    ok: true,
    configured: true,
    baseBranch: config.baseBranch,
    activeDraft,
    allDraftBranches: draftRefs.map((d) => ({ branch: d.branch, sha: d.sha })),
    anomalies,
    openPullRequests,
  };
}

export async function loadContentSnapshot(
  config: GitHubConfig,
  ref = config.baseBranch,
  fetchImpl: FetchLike = fetch
): Promise<ContentSnapshot> {
  if (!isAllowedSnapshotRef(ref, config.baseBranch)) {
    throw new GitHubApiError(
      400,
      `Ref "${ref}" non consentita. Usa "${config.baseBranch}" oppure una branch "draft/*".`
    );
  }

  const refObj = await githubRequest<GitHubRefItem>(
    config,
    `/git/ref/heads/${encodeRefPath(ref)}`,
    {},
    fetchImpl
  );
  const commitSha = refObj.object.sha;

  const commitObj = await githubRequest<{ sha: string; tree: { sha: string } }>(
    config,
    `/git/commits/${encodeURIComponent(commitSha)}`,
    {},
    fetchImpl
  );

  const treeRes = await githubRequest<{
    sha: string;
    truncated?: boolean;
    tree: Array<{ path: string; type: string; sha: string }>;
  }>(
    config,
    `/git/trees/${encodeURIComponent(commitObj.tree.sha)}?recursive=1`,
    {},
    fetchImpl
  );

  const jsonEntries = (treeRes.tree || [])
    .filter((entry) => entry.type === 'blob' && isEditableTreeJsonPath(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  const loadedEntries = await mapInBatches(jsonEntries, 8, async (entry) => {
    const blob = await githubRequest<{ content: string; encoding: string }>(
      config,
      `/git/blobs/${encodeURIComponent(entry.sha)}`,
      {},
      fetchImpl
    );
    const decoded =
      blob.encoding === 'base64'
        ? Buffer.from(blob.content.replace(/\n/g, ''), 'base64').toString('utf8')
        : blob.content;

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch (err) {
      throw new GitHubApiError(
        502,
        `File JSON non valido nel repository (${entry.path}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    return { path: entry.path, data: parsed };
  });

  const files: Record<string, unknown> = {};
  for (const item of loadedEntries) {
    files[item.path] = item.data;
  }

  return {
    ref,
    commitSha,
    files,
  };
}

export interface AtomicCommitParams {
  branch: string;
  baseBranch?: string;
  message: string;
  upserts: AtomicFileUpsert[];
  deletes?: string[];
}

export async function commitChangesAtomically(
  config: GitHubConfig,
  params: AtomicCommitParams,
  fetchImpl: FetchLike = fetch
): Promise<{ branch: string; commitSha: string; treeSha: string }> {
  const { branch, message, upserts, deletes = [] } = params;
  const baseBranch = params.baseBranch || config.baseBranch;

  if (branch === config.baseBranch || !isSafePublishBranch(branch)) {
    throw new GitHubApiError(
      400,
      `Branch di destinazione non valida ("${branch}"). Non è consentito committare direttamente su "${config.baseBranch}".`
    );
  }

  if (upserts.length === 0 && deletes.length === 0) {
    throw new GitHubApiError(400, 'Nessuna modifica da committare.');
  }

  for (const file of upserts) {
    if (!isAllowedRepoWritePath(file.path)) {
      throw new GitHubApiError(400, `Path di scrittura non consentito: "${file.path}"`);
    }
  }
  for (const delPath of deletes) {
    if (!isAllowedRepoWritePath(delPath)) {
      throw new GitHubApiError(400, `Path di eliminazione non consentito: "${delPath}"`);
    }
  }

  // Ensure branch exists (or create it from baseBranch HEAD)
  let branchHeadSha: string;
  try {
    const existingRef = await githubRequest<GitHubRefItem>(
      config,
      `/git/ref/heads/${encodeRefPath(branch)}`,
      {},
      fetchImpl
    );
    branchHeadSha = existingRef.object.sha;
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      const baseRef = await githubRequest<GitHubRefItem>(
        config,
        `/git/ref/heads/${encodeRefPath(baseBranch)}`,
        {},
        fetchImpl
      );
      const createdRef = await githubRequest<GitHubRefItem>(
        config,
        '/git/refs',
        {
          method: 'POST',
          body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: baseRef.object.sha,
          }),
        },
        fetchImpl
      );
      branchHeadSha = createdRef.object.sha;
    } else {
      throw err;
    }
  }

  const headCommit = await githubRequest<{ sha: string; tree: { sha: string } }>(
    config,
    `/git/commits/${encodeURIComponent(branchHeadSha)}`,
    {},
    fetchImpl
  );
  const baseTreeSha = headCommit.tree.sha;

  // If deleting files, verify which paths exist in baseTreeSha so Git Data API never throws 422
  let existingTreePaths: Set<string> | null = null;
  if (deletes.length > 0) {
    const treeRes = await githubRequest<{
      tree: Array<{ path: string; type: string }>;
    }>(
      config,
      `/git/trees/${encodeURIComponent(baseTreeSha)}?recursive=1`,
      {},
      fetchImpl
    );
    existingTreePaths = new Set((treeRes.tree || []).map((t) => t.path));
  }

  const createdBlobs = await mapInBatches(upserts, 8, async (file) => {
    const blobRes = await githubRequest<{ sha: string }>(
      config,
      '/git/blobs',
      {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: file.encoding ?? 'utf-8',
        }),
      },
      fetchImpl
    );
    return {
      path: file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blobRes.sha,
    };
  });

  const deleteEntries = deletes
    .filter((delPath) => !existingTreePaths || existingTreePaths.has(delPath))
    .map((delPath) => ({
      path: delPath,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: null,
    }));

  const treePayload = [...createdBlobs, ...deleteEntries];

  if (treePayload.length === 0) {
    return {
      branch,
      commitSha: branchHeadSha,
      treeSha: baseTreeSha,
    };
  }

  const newTree = await githubRequest<{ sha: string }>(
    config,
    '/git/trees',
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treePayload,
      }),
    },
    fetchImpl
  );

  const newCommit = await githubRequest<{ sha: string }>(
    config,
    '/git/commits',
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [branchHeadSha],
      }),
    },
    fetchImpl
  );

  await githubRequest(
    config,
    `/git/refs/heads/${encodeRefPath(branch)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    },
    fetchImpl
  );

  return {
    branch,
    commitSha: newCommit.sha,
    treeSha: newTree.sha,
  };
}

export interface BinaryAssetUpsert {
  path: string;
  contentBase64: string;
}

export interface SaveDraftParams {
  branch?: string;
  draftTitle?: string;
  message?: string;
  upserts: Array<{ path: string; data: unknown }>;
  deletes: string[];
  binaryUpserts?: BinaryAssetUpsert[];
  binaryDeletes?: string[];
}

function validateAllJsonMutations(
  upserts: Array<{ path: string; data: unknown }>,
  deletes: string[],
  binaryUpserts: BinaryAssetUpsert[] = [],
  binaryDeletes: string[] = []
): void {
  for (const delPath of deletes) {
    if (!isAllowedContentPath(delPath)) {
      throw new GitHubApiError(400, `Path di eliminazione non consentito: "${delPath}"`);
    }
  }

  for (const item of upserts) {
    const check = validateContentFile(item.path, item.data);
    if (!check.ok) {
      throw new GitHubApiError(
        400,
        `Validazione Zod fallita per "${item.path}"`,
        { filePath: item.path, issues: check.issues }
      );
    }
  }

  for (const bin of binaryUpserts) {
    if (!isAllowedBinaryAssetPath(bin.path)) {
      throw new GitHubApiError(
        400,
        `Path asset binario non consentito (consentite solo sottocartelle assets/tech-gallery/ o assets/uploads/): "${bin.path}"`
      );
    }
    if (!bin.contentBase64 || bin.contentBase64.length > 4_200_000) {
      throw new GitHubApiError(400, `Dimensione asset binario non valida per "${bin.path}"`);
    }
  }

  for (const binDel of binaryDeletes) {
    if (!isAllowedBinaryAssetPath(binDel)) {
      throw new GitHubApiError(400, `Path eliminazione asset binario non consentito: "${binDel}"`);
    }
  }
}

export async function saveDraft(
  config: GitHubConfig,
  params: SaveDraftParams,
  fetchImpl: FetchLike = fetch
): Promise<SaveDraftResult> {
  const binaryUpserts = params.binaryUpserts ?? [];
  const binaryDeletes = params.binaryDeletes ?? [];

  if (
    params.upserts.length === 0 &&
    params.deletes.length === 0 &&
    binaryUpserts.length === 0 &&
    binaryDeletes.length === 0
  ) {
    throw new GitHubApiError(400, 'Nessuna modifica da salvare in bozza.');
  }

  validateAllJsonMutations(params.upserts, params.deletes, binaryUpserts, binaryDeletes);

  const existingDrafts = await listDraftRefs(config, fetchImpl);
  let targetBranch = params.branch?.trim();

  if (targetBranch) {
    if (!isSafeDraftBranch(targetBranch)) {
      throw new GitHubApiError(400, `Nome branch bozza non valido: "${targetBranch}"`);
    }
    const conflicting = existingDrafts.find((d) => d.branch !== targetBranch);
    if (conflicting) {
      throw new GitHubApiError(
        409,
        `Esiste già un'altra branch di bozza attiva ("${conflicting.branch}"). Riprendi o scarta la bozza esistente prima di salvarne una diversa.`
      );
    }
  } else {
    if (existingDrafts.length > 0) {
      throw new GitHubApiError(
        409,
        `Esiste già una branch di bozza attiva ("${existingDrafts[0].branch}"). Riprendi o scarta la bozza esistente.`
      );
    }
    const slug = slugify(params.draftTitle || 'bozza', 'bozza');
    targetBranch = `draft/${slug}-${formatTimestampCompact()}`;
  }

  const rawMsg = (params.message || 'Aggiornamento contenuti dal portale admin').trim();
  const commitMessage = rawMsg.startsWith('[DRAFT]') ? rawMsg : `[DRAFT] ${rawMsg}`;

  const atomicUpserts: AtomicFileUpsert[] = [
    ...params.upserts.map((u) => ({
      path: u.path,
      content: formatCanonicalJson(u.data),
      encoding: 'utf-8' as const,
    })),
    ...binaryUpserts.map((b) => ({
      path: b.path,
      content: b.contentBase64,
      encoding: 'base64' as const,
    })),
  ];

  const committed = await commitChangesAtomically(
    config,
    {
      branch: targetBranch,
      baseBranch: config.baseBranch,
      message: commitMessage,
      upserts: atomicUpserts,
      deletes: [...params.deletes, ...binaryDeletes],
    },
    fetchImpl
  );

  return {
    branch: committed.branch,
    commitSha: committed.commitSha,
    message: commitMessage,
  };
}

export async function discardDraft(
  config: GitHubConfig,
  branch: string,
  fetchImpl: FetchLike = fetch
): Promise<DiscardDraftResult> {
  if (!isSafeDraftBranch(branch)) {
    throw new GitHubApiError(400, `Branch non valida per lo scarto bozza: "${branch}"`);
  }

  const refData = await githubRequest<GitHubRefItem>(
    config,
    `/git/ref/heads/${encodeRefPath(branch)}`,
    {},
    fetchImpl
  );
  const lastSha = refData.object.sha;

  const slug = slugify(branch.replace(/^draft\//, ''), 'draft');
  const archiveTag = `archive/draft/${formatTimestampCompact()}-${slug}`;

  // 1. Archive via Git Tag before deleting the branch
  await githubRequest(
    config,
    '/git/refs',
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/tags/${archiveTag}`,
        sha: lastSha,
      }),
    },
    fetchImpl
  );

  // 2. Close any open Pull Request from this draft branch
  const openPrs = await githubRequest<GitHubPullRaw[]>(
    config,
    `/pulls?state=open&head=${encodeURIComponent(`${config.owner}:${branch}`)}`,
    {},
    fetchImpl
  );
  const closedPrNumbers: number[] = [];
  for (const pr of openPrs || []) {
    await githubRequest(
      config,
      `/pulls/${pr.number}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' }),
      },
      fetchImpl
    );
    closedPrNumbers.push(pr.number);
  }

  // 3. Delete the draft branch
  await githubRequest(
    config,
    `/git/refs/heads/${encodeRefPath(branch)}`,
    {
      method: 'DELETE',
    },
    fetchImpl
  );

  return {
    deletedBranch: branch,
    archiveTag,
    closedPrNumbers,
  };
}

export interface PublishDraftParams {
  branch?: string;
  title?: string;
  notes?: string;
  upserts: Array<{ path: string; data: unknown }>;
  deletes: string[];
  binaryUpserts?: BinaryAssetUpsert[];
  binaryDeletes?: string[];
  diffSummary?: Array<{ path: string; status: string; changesCount: number }>;
}

function buildPullRequestBody(params: PublishDraftParams, workBranch: string): string {
  const lines: string[] = [
    '## Aggiornamento contenuti dal Portale Admin (`podadj.it`)',
    '',
    `- **Branch sorgente**: \`${workBranch}\``,
    `- **Validazione Zod**: Eseguita lato server prima del commit`,
  ];

  if (params.notes?.trim()) {
    lines.push('', '### Note dell\'autore', params.notes.trim());
  }

  if (params.diffSummary && params.diffSummary.length > 0) {
    lines.push('', '### File modificati');
    for (const item of params.diffSummary) {
      lines.push(`- \`${item.path}\` (${item.status}, ${item.changesCount} variazioni)`);
    }
  } else {
    lines.push('', '### Operazioni inviate');
    for (const u of params.upserts) {
      lines.push(`- \`${u.path}\` (aggiornato/creato)`);
    }
    for (const d of params.deletes) {
      lines.push(`- \`${d}\` (eliminato)`);
    }
  }

  if (params.binaryUpserts && params.binaryUpserts.length > 0) {
    lines.push('', '### Nuovi Asset Immagini (`assets/`)');
    for (const b of params.binaryUpserts) {
      lines.push(`- \`${b.path}\` (caricato per ottimizzazione Sharp in build)`);
    }
  }

  lines.push(
    '',
    '---',
    '_Questa PR è stata generata automaticamente dal portale `/admin`. Al merge su `main`, Vercel distribuirà automaticamente il sito aggiornato._'
  );

  return lines.join('\n');
}

export async function publishDraft(
  config: GitHubConfig,
  params: PublishDraftParams,
  fetchImpl: FetchLike = fetch
): Promise<PublishDraftResult> {
  const binaryUpserts = params.binaryUpserts ?? [];
  const binaryDeletes = params.binaryDeletes ?? [];

  // Always validate all JSON upserts via Zod and binary paths before touching GitHub
  validateAllJsonMutations(params.upserts, params.deletes, binaryUpserts, binaryDeletes);

  const hasLocalDiffs =
    params.upserts.length > 0 ||
    params.deletes.length > 0 ||
    binaryUpserts.length > 0 ||
    binaryDeletes.length > 0;
  const prTitle = (
    params.title?.trim() ||
    `CMS: Aggiornamento contenuti (${new Date().toISOString().slice(0, 10)})`
  ).slice(0, 120);

  let workBranch: string;
  let headCommitSha: string;

  const atomicUpserts: AtomicFileUpsert[] = [
    ...params.upserts.map((u) => ({
      path: u.path,
      content: formatCanonicalJson(u.data),
      encoding: 'utf-8' as const,
    })),
    ...binaryUpserts.map((b) => ({
      path: b.path,
      content: b.contentBase64,
      encoding: 'base64' as const,
    })),
  ];

  if (params.branch && isSafeDraftBranch(params.branch)) {
    workBranch = params.branch;

    if (hasLocalDiffs) {
      const committed = await commitChangesAtomically(
        config,
        {
          branch: workBranch,
          baseBranch: config.baseBranch,
          message: `cms: ${prTitle}`,
          upserts: atomicUpserts,
          deletes: [...params.deletes, ...binaryDeletes],
        },
        fetchImpl
      );
      headCommitSha = committed.commitSha;
    } else {
      const compare = await githubRequest<{ ahead_by: number; commits?: Array<{ sha: string }> }>(
        config,
        `/compare/${encodeRefPath(config.baseBranch)}...${encodeRefPath(workBranch)}`,
        {},
        fetchImpl
      );
      if (!compare.ahead_by || compare.ahead_by <= 0) {
        throw new GitHubApiError(
          400,
          `La branch "${workBranch}" non contiene modifiche rispetto a "${config.baseBranch}".`
        );
      }
      const refObj = await githubRequest<GitHubRefItem>(
        config,
        `/git/ref/heads/${encodeRefPath(workBranch)}`,
        {},
        fetchImpl
      );
      headCommitSha = refObj.object.sha;
    }
  } else {
    if (!hasLocalDiffs) {
      throw new GitHubApiError(400, 'Nessuna modifica da pubblicare.');
    }
    workBranch = `publish/cms-${formatTimestampCompact()}`;
    const committed = await commitChangesAtomically(
      config,
      {
        branch: workBranch,
        baseBranch: config.baseBranch,
        message: `cms: ${prTitle}`,
        upserts: atomicUpserts,
        deletes: [...params.deletes, ...binaryDeletes],
      },
      fetchImpl
    );
    headCommitSha = committed.commitSha;
  }

  const prBody = buildPullRequestBody(params, workBranch);
  const existingPrs = await githubRequest<GitHubPullRaw[]>(
    config,
    `/pulls?state=open&head=${encodeURIComponent(`${config.owner}:${workBranch}`)}&base=${encodeURIComponent(config.baseBranch)}`,
    {},
    fetchImpl
  );

  let prRaw: GitHubPullRaw;
  let updatedExisting = false;

  if (existingPrs && existingPrs.length > 0) {
    updatedExisting = true;
    prRaw = await githubRequest<GitHubPullRaw>(
      config,
      `/pulls/${existingPrs[0].number}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: prTitle,
          body: prBody,
        }),
      },
      fetchImpl
    );
  } else {
    prRaw = await githubRequest<GitHubPullRaw>(
      config,
      '/pulls',
      {
        method: 'POST',
        body: JSON.stringify({
          title: prTitle,
          head: workBranch,
          base: config.baseBranch,
          body: prBody,
        }),
      },
      fetchImpl
    );
  }

  const enriched = await enrichPullRequestSummary(config, prRaw, fetchImpl);

  return {
    prNumber: enriched.number,
    prUrl: enriched.url,
    branch: workBranch,
    commitSha: headCommitSha,
    prState: enriched.state,
    checkState: enriched.checkState ?? 'unknown',
    vercelPreviewUrl: enriched.vercelPreviewUrl ?? null,
    updatedExisting,
  };
}
