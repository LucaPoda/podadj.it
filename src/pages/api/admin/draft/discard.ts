import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import { handleGitHubRouteError } from '../../../../lib/apiHelpers';
import { discardDraft, getGitHubConfig } from '../../../../lib/github';

export const prerender = false;

const DiscardDraftBodySchema = z.object({
  branch: z
    .string()
    .min(1)
    .refine((b) => b.startsWith('draft/'), 'La branch deve avere prefisso "draft/"'),
});

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload JSON non valido' }, 400);
  }

  const parsed = DiscardDraftBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: 'Branch bozza non valida',
        details: parsed.error.issues,
      },
      400
    );
  }

  try {
    const config = getGitHubConfig();
    const result = await discardDraft(config, parsed.data.branch);
    return jsonResponse({ ok: true, ...result }, 200);
  } catch (err) {
    return handleGitHubRouteError(err);
  }
};
