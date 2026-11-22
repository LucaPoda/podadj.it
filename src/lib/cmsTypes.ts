export interface DraftCommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  headRef: string;
  baseRef: string;
  headSha: string;
  draft: boolean;
  mergeableState?: string | null;
  checkState?: 'success' | 'pending' | 'failure' | 'unknown';
  vercelPreviewUrl?: string | null;
  updatedAt: string;
}

export interface DraftBranchInfo {
  branch: string;
  ref: string;
  sha: string;
  commit: DraftCommitInfo;
  openPr: PullRequestSummary | null;
}

export interface DraftStatusResponse {
  ok: true;
  configured: boolean;
  baseBranch: string;
  missingEnv?: string[];
  activeDraft: DraftBranchInfo | null;
  allDraftBranches: Array<{ branch: string; sha: string }>;
  anomalies: string[];
  openPullRequests: PullRequestSummary[];
}

export interface ContentSnapshot {
  ref: string;
  commitSha: string;
  files: Record<string, unknown>;
}

export interface AtomicFileUpsert {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface SaveDraftResult {
  branch: string;
  commitSha: string;
  message: string;
}

export interface DiscardDraftResult {
  deletedBranch: string;
  archiveTag: string;
  closedPrNumbers: number[];
}

export interface PublishDraftResult {
  prNumber: number;
  prUrl: string;
  branch: string;
  commitSha: string;
  prState: 'open' | 'closed';
  checkState: 'success' | 'pending' | 'failure' | 'unknown';
  vercelPreviewUrl: string | null;
  updatedExisting: boolean;
}
