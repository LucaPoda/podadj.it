import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, requireAdminSession } from '../../../../lib/auth';
import {
  searchSpotifyTracks,
  SpotifyApiError,
  SpotifyConfigError,
} from '../../../../lib/spotify';

export const prerender = false;

const SpotifySearchBodySchema = z.object({
  queries: z
    .array(
      z.object({
        queryId: z.string().min(1),
        title: z.string().min(1),
        artist: z.string().min(1),
        playedLabel: z.string().optional(),
        originalTracks: z
          .array(
            z.object({
              title: z.string().min(1),
              artist: z.string().min(1),
            })
          )
          .optional(),
      })
    )
    .min(1)
    .max(20),
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

  const parsed = SpotifySearchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: 'Richiesta di ricerca Spotify non valida (max 20 tracce per batch)',
        details: parsed.error.issues,
      },
      400
    );
  }

  try {
    const results = await searchSpotifyTracks(parsed.data.queries);
    return jsonResponse({ ok: true, results }, 200);
  } catch (err) {
    if (err instanceof SpotifyConfigError) {
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
    if (err instanceof SpotifyApiError) {
      return jsonResponse(
        {
          ok: false,
          error: err.message,
        },
        err.status >= 400 && err.status < 600 ? err.status : 502
      );
    }
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Spotify search error',
      },
      500
    );
  }
};
