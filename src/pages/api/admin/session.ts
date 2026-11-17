import type { APIRoute } from 'astro';
import {
  AuthConfigError,
  getAuthConfig,
  getSessionFromRequest,
  jsonResponse,
} from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  let config;
  try {
    config = getAuthConfig();
  } catch (err) {
    const message =
      err instanceof AuthConfigError
        ? err.message
        : 'Server authentication configuration is incomplete';
    return jsonResponse({ ok: false, authenticated: false, error: message }, 500);
  }

  const session = getSessionFromRequest(request, config.sessionSecret);
  return jsonResponse(
    {
      ok: true,
      authenticated: Boolean(session),
      expiresAt: session?.exp ?? null,
    },
    200
  );
};
