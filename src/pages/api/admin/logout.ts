import type { APIRoute } from 'astro';
import { buildClearSessionCookieHeader, jsonResponse } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  return jsonResponse(
    { ok: true, authenticated: false },
    200,
    { 'Set-Cookie': buildClearSessionCookieHeader(request) }
  );
};
