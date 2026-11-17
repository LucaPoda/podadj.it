import type { APIRoute } from 'astro';
import {
  AuthConfigError,
  buildSessionCookieHeader,
  createSessionToken,
  getAuthConfig,
  jsonResponse,
  verifyAdminPassword,
} from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, authenticated: false, error: 'Invalid JSON payload' }, 400);
  }

  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof password !== 'string' || password.length === 0) {
    return jsonResponse({ ok: false, authenticated: false, error: 'Password is required' }, 400);
  }

  const isValid = verifyAdminPassword(password, config.adminPassword);
  if (!isValid) {
    return jsonResponse({ ok: false, authenticated: false, error: 'Invalid credentials' }, 401);
  }

  const token = createSessionToken(config.sessionSecret);
  return jsonResponse(
    { ok: true, authenticated: true },
    200,
    { 'Set-Cookie': buildSessionCookieHeader(token, request) }
  );
};
