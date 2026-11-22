import { jsonResponse } from './auth';
import { GitHubApiError, GitHubConfigError } from './github';

export function handleGitHubRouteError(err: unknown): Response {
  if (err instanceof GitHubConfigError) {
    return jsonResponse(
      {
        ok: false,
        configured: false,
        missingEnv: err.missing,
        error: err.message,
      },
      503
    );
  }

  if (err instanceof GitHubApiError) {
    return jsonResponse(
      {
        ok: false,
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      err.status >= 400 && err.status < 600 ? err.status : 502
    );
  }

  return jsonResponse(
    {
      ok: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    },
    500
  );
}
