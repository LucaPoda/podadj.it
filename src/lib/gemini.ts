export type AiAssistAction = 'optimize_it' | 'translate_en';

export type AiAssistContext =
  | 'event'
  | 'demo'
  | 'tech_package'
  | 'tech_gallery'
  | 'site_copy'
  | 'seo_meta'
  | 'general';

export class GeminiConfigError extends Error {
  code = 'NOT_CONFIGURED' as const;
  constructor(message = 'GEMINI_API_KEY non configurata sul server.') {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export class GeminiRateLimitError extends Error {
  code = 'RATE_LIMIT' as const;
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'GeminiRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GeminiApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.code = code;
  }
}

type FetchLike = typeof fetch;

function readEnv(name: 'GEMINI_API_KEY' | 'GEMINI_MODEL'): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
  const val = (fromProcess ?? fromImportMeta ?? '').trim();
  return val.length > 0 ? val : undefined;
}

export function getGeminiConfig(): { apiKey: string; model: string } {
  const apiKey = readEnv('GEMINI_API_KEY');
  if (!apiKey) {
    throw new GeminiConfigError();
  }
  const model = readEnv('GEMINI_MODEL') || 'gemini-2.5-flash';
  return { apiKey, model };
}

const CONTEXT_DESCRIPTIONS: Record<AiAssistContext, string> = {
  event: 'scheda evento live / debriefing tecnico di un DJ set o festival',
  demo: 'descrizione o note di stile di una demo mixata DJ (Techno, House, Mainstage)',
  tech_package: 'pacchetto service audio/luci chiavi in mano per eventi e DJ set',
  tech_gallery: 'didascalia fotografica di setup audio PA, consolle Pioneer DJ o luci DMX',
  site_copy: 'testo interfaccia/bio del sito ufficiale di PODA DJ',
  seo_meta: 'meta title o meta description SEO (concisa e ad alta leggibilità)',
  general: 'contenuto editoriale per sito DJ Producer e Service Audio/Luci',
};

function buildPrompt(action: AiAssistAction, text: string, context: AiAssistContext): {
  systemInstruction: string;
  userPrompt: string;
} {
  const ctxDesc = CONTEXT_DESCRIPTIONS[context] || CONTEXT_DESCRIPTIONS.general;

  if (action === 'optimize_it') {
    return {
      systemInstruction:
        'Sei il copywriter tecnico di PODA DJ (DJ Producer & Sound System Specialist). Riscrivi il testo in italiano con tono autentico da club culture, festival e tecnico audio FOH: concreto, energico, preciso e naturale. Evita linguaggio aziendale, cliché da comunicato stampa o esagerazioni vuote. Mantieni invariati numeri, modelli hardware (es. Proel DIVA, Pioneer DJ, Behringer X-AIR), date e nomi propri. Rispondi esclusivamente con il testo riscritto finale, senza virgolette, premesse o spiegazioni.',
      userPrompt: `Contesto: ${ctxDesc}.\n\nTesto originale da ottimizzare in italiano:\n${text}`,
    };
  }

  return {
    systemInstruction:
      'You are the English copy editor for PODA DJ (Electronic Music DJ Producer & Pro Audio/Lighting Specialist). Translate the Italian text into natural, idiomatic English used in clubbing, festivals, DJ booths, and FOH sound engineering. Avoid literal word-for-word phrasing. Preserve all technical specs, hardware model names, BPMs, dates, and proper nouns. Reply strictly with the translated English text only, with no quotes, preamble, or notes.',
    userPrompt: `Context: ${ctxDesc}.\n\nItalian text to translate into natural club/pro-audio English:\n${text}`,
  };
}

export async function assistTextWithGemini(
  params: {
    action: AiAssistAction;
    text: string;
    context?: AiAssistContext;
  },
  fetchImpl: FetchLike = fetch
): Promise<{ resultText: string; model: string }> {
  const { apiKey, model } = getGeminiConfig();
  const context = params.context ?? 'general';
  const { systemInstruction, userPrompt } = buildPrompt(params.action, params.text, context);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: params.action === 'translate_en' ? 0.25 : 0.55,
      },
    }),
  });

  const rawText = await response.text();
  let parsed: Record<string, unknown> | null = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  const apiErr = parsed?.error as { status?: string; message?: string; code?: number } | undefined;
  const isRateLimit =
    response.status === 429 ||
    apiErr?.status === 'RESOURCE_EXHAUSTED' ||
    apiErr?.code === 429;

  if (isRateLimit) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const parsedRetry = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const retryAfterSeconds =
      Number.isFinite(parsedRetry) && parsedRetry > 0 ? Math.ceil(parsedRetry) : 60;
    throw new GeminiRateLimitError(
      'Limite di richieste Gemini raggiunto (429). Puoi continuare manualmente o riprovare tra poco.',
      retryAfterSeconds
    );
  }

  if (!response.ok) {
    throw new GeminiApiError(
      response.status,
      apiErr?.status || 'GEMINI_ERROR',
      apiErr?.message || `Gemini API error (${response.status})`
    );
  }

  const candidates = parsed?.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const outText = candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!outText) {
    throw new GeminiApiError(502, 'EMPTY_RESPONSE', 'Gemini non ha restituito alcun testo.');
  }

  return {
    resultText: outText,
    model,
  };
}
