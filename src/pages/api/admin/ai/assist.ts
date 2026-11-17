import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import {
  assistTextWithGemini,
  GeminiApiError,
  GeminiConfigError,
  GeminiRateLimitError,
} from '../../../../lib/gemini';

export const prerender = false;

const AiAssistBodySchema = z.object({
  action: z.enum(['optimize_it', 'translate_en']),
  text: z.string().trim().min(1, 'Il testo non può essere vuoto').max(8000),
  context: z
    .enum([
      'event',
      'demo',
      'tech_package',
      'tech_gallery',
      'site_copy',
      'seo_meta',
      'general',
    ])
    .optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdminSession(request);
  if (!auth.ok) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ ok: false, code: 'BAD_REQUEST', error: 'Payload JSON non valido' }, 400);
  }

  const parsed = AiAssistBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        code: 'VALIDATION_ERROR',
        error: 'Parametri richiesta AI non validi',
        details: parsed.error.issues,
      },
      400
    );
  }

  try {
    const result = await assistTextWithGemini(parsed.data);
    return jsonResponse(
      {
        ok: true,
        text: result.resultText,
        model: result.model,
      },
      200
    );
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return jsonResponse(
        {
          ok: false,
          code: err.code,
          error: err.message,
        },
        503
      );
    }
    if (err instanceof GeminiRateLimitError) {
      return jsonResponse(
        {
          ok: false,
          code: err.code,
          retryAfterSeconds: err.retryAfterSeconds,
          error: err.message,
        },
        429
      );
    }
    if (err instanceof GeminiApiError) {
      return jsonResponse(
        {
          ok: false,
          code: err.code,
          error: err.message,
        },
        err.status >= 400 && err.status < 600 ? err.status : 502
      );
    }
    return jsonResponse(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        error: err instanceof Error ? err.message : 'Errore interno assistente AI',
      },
      500
    );
  }
};
