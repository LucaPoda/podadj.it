import crypto from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'poda_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

interface AuthConfig {
  adminPassword: string;
  sessionSecret: string;
}

function readEnv(name: 'ADMIN_PASSWORD' | 'SESSION_SECRET'): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromImportMeta = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
  const value = (fromProcess ?? fromImportMeta ?? '').trim();
  return value.length > 0 ? value : undefined;
}

export function getAuthConfig(): AuthConfig {
  const adminPassword = readEnv('ADMIN_PASSWORD');
  const sessionSecret = readEnv('SESSION_SECRET');

  if (!adminPassword || !sessionSecret) {
    const missing = [
      !adminPassword ? 'ADMIN_PASSWORD' : null,
      !sessionSecret ? 'SESSION_SECRET' : null,
    ]
      .filter(Boolean)
      .join(', ');
    throw new AuthConfigError(`Missing required server auth environment variable(s): ${missing}`);
  }

  return { adminPassword, sessionSecret };
}

function sha256Digest(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

export function verifyAdminPassword(candidatePassword: string, expectedPassword: string): boolean {
  const expectedDigest = sha256Digest(expectedPassword);
  const candidateDigest = sha256Digest(candidatePassword);
  return crypto.timingSafeEqual(expectedDigest, candidateDigest);
}

function signPayload(payloadBase64Url: string, sessionSecret: string): string {
  return crypto.createHmac('sha256', sessionSecret).update(payloadBase64Url).digest('base64url');
}

export function createSessionToken(sessionSecret: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const payload: AdminSessionPayload = {
    role: 'admin',
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const payloadBase64Url = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(payloadBase64Url, sessionSecret);
  return `${payloadBase64Url}.${signature}`;
}

export function verifySessionToken(token: string, sessionSecret: string): AdminSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64Url, signature] = parts;
  if (!payloadBase64Url || !signature) return null;

  const expectedSignature = signPayload(payloadBase64Url, sessionSecret);
  const sigDigest = sha256Digest(signature);
  const expectedDigest = sha256Digest(expectedSignature);

  if (!crypto.timingSafeEqual(sigDigest, expectedDigest)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadBase64Url, 'base64url').toString('utf8')) as Partial<AdminSessionPayload>;
    if (
      decoded.role !== 'admin' ||
      typeof decoded.iat !== 'number' ||
      typeof decoded.exp !== 'number'
    ) {
      return null;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSeconds) {
      return null;
    }
    return {
      role: 'admin',
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function getSessionFromRequest(request: Request, sessionSecret: string): AdminSessionPayload | null {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return null;
  return verifySessionToken(token, sessionSecret);
}

/**
 * Safely checks whether the request has a valid admin session without throwing
 * when auth env vars are unconfigured (useful for SSR page shells like /admin).
 */
export function tryGetAdminSession(request: Request): AdminSessionPayload | null {
  try {
    const { sessionSecret } = getAuthConfig();
    return getSessionFromRequest(request, sessionSecret);
  } catch {
    return null;
  }
}

export type AdminAuthResult =
  | { ok: true; session: AdminSessionPayload }
  | { ok: false; response: Response };

export function requireAdminSession(request: Request): AdminAuthResult {
  let config: AuthConfig;
  try {
    config = getAuthConfig();
  } catch (err) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          authenticated: false,
          error: err instanceof Error ? err.message : 'Server auth configuration error',
        },
        500
      ),
    };
  }

  const session = getSessionFromRequest(request, config.sessionSecret);
  if (!session) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          authenticated: false,
          error: 'Unauthorized',
        },
        401
      ),
    };
  }

  return { ok: true, session };
}

function shouldUseSecureCookie(request: Request): boolean {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttps = url.protocol === 'https:' || forwardedProto === 'https';
  const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';
  return isHttps || isVercel;
}

export function buildSessionCookieHeader(token: string, request: Request): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (shouldUseSecureCookie(request)) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearSessionCookieHeader(request: Request): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (shouldUseSecureCookie(request)) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
