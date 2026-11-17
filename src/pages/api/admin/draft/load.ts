import type { APIRoute } from 'astro';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import { handleGitHubRouteError } from '../../../../lib/apiHelpers';
import {
  getGitHubConfig,
  isAllowedSnapshotRef,
  loadContentSnapshot,
} from '../../../../lib/github';
import { validateSnapshotFiles } from '../../../../lib/contentValidation';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  try {
    const config = getGitHubConfig();
    const url = new URL(request.url);
    const requestedRef = url.searchParams.get('ref')?.trim() || config.baseBranch;

    if (!isAllowedSnapshotRef(requestedRef, config.baseBranch)) {
      return jsonResponse(
        {
          ok: false,
          error: `Ref "${requestedRef}" non consentita. Usa "${config.baseBranch}" o una branch "draft/*".`,
        },
        400
      );
    }

    const snapshot = await loadContentSnapshot(config, requestedRef);
    const validation = validateSnapshotFiles(snapshot.files);

    return jsonResponse(
      {
        ok: true,
        snapshot,
        validation,
      },
      200
    );
  } catch (err) {
    return handleGitHubRouteError(err);
  }
};
