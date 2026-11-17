import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import { handleGitHubRouteError } from '../../../../lib/apiHelpers';
import { getGitHubConfig, saveDraft } from '../../../../lib/github';

export const prerender = false;

const SaveDraftBodySchema = z.object({
  branch: z.string().min(1).optional(),
  draftTitle: z.string().min(1).max(80).optional(),
  message: z.string().min(1).max(200).optional(),
  upserts: z
    .array(
      z.object({
        path: z.string().min(1),
        data: z.union([z.record(z.unknown()), z.array(z.unknown())]),
      })
    )
    .default([]),
  deletes: z.array(z.string().min(1)).default([]),
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

  const parsed = SaveDraftBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: 'Richiesta di salvataggio bozza non valida',
        details: parsed.error.issues,
      },
      400
    );
  }

  try {
    const config = getGitHubConfig();
    const result = await saveDraft(config, parsed.data);
    return jsonResponse({ ok: true, ...result }, 200);
  } catch (err) {
    return handleGitHubRouteError(err);
  }
};
