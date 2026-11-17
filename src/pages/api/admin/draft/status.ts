import type { APIRoute } from 'astro';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import { handleGitHubRouteError } from '../../../../lib/apiHelpers';
import {
  getBaseBranchFallback,
  getDraftStatus,
  getGitHubConfig,
  getMissingGitHubEnvVars,
} from '../../../../lib/github';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  const missingEnv = getMissingGitHubEnvVars();
  if (missingEnv.length > 0) {
    return jsonResponse(
      {
        ok: true,
        configured: false,
        baseBranch: getBaseBranchFallback(),
        missingEnv,
        activeDraft: null,
        allDraftBranches: [],
        anomalies: [],
        openPullRequests: [],
      },
      200
    );
  }

  try {
    const config = getGitHubConfig();
    const status = await getDraftStatus(config);
    return jsonResponse({ ...status }, 200);
  } catch (err) {
    return handleGitHubRouteError(err);
  }
};
