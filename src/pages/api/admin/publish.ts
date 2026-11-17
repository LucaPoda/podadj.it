import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, requireAdminSession } from '../../../lib/auth';
import { handleGitHubRouteError } from '../../../lib/apiHelpers';
import { getGitHubConfig, publishDraft } from '../../../lib/github';

export const prerender = false;

const PublishBodySchema = z.object({
  branch: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional(),
  notes: z.string().max(2000).optional(),
  upserts: z
    .array(
      z.object({
        path: z.string().min(1),
        data: z.union([z.record(z.unknown()), z.array(z.unknown())]),
      })
    )
    .default([]),
  deletes: z.array(z.string().min(1)).default([]),
  binaryUpserts: z
    .array(
      z.object({
        path: z.string().min(1),
        contentBase64: z.string().min(1),
      })
    )
    .default([]),
  binaryDeletes: z.array(z.string().min(1)).default([]),
  diffSummary: z
    .array(
      z.object({
        path: z.string().min(1),
        status: z.string().min(1),
        changesCount: z.number().int().nonnegative(),
      })
    )
    .optional(),
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

  const parsed = PublishBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: 'Richiesta di pubblicazione non valida',
        details: parsed.error.issues,
      },
      400
    );
  }

  try {
    const config = getGitHubConfig();
    const result = await publishDraft(config, parsed.data);
    return jsonResponse({ ok: true, ...result }, 200);
  } catch (err) {
    return handleGitHubRouteError(err);
  }
};
