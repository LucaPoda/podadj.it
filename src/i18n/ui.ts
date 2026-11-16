import it from './it.json';
import en from './en.json';

export const defaultLocale = 'it' as const;
export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];

export const translations = {
  it,
  en,
} as const;

export function useTranslations(locale: Locale = defaultLocale) {
  const current = translations[locale] || translations[defaultLocale];
  return current;
}

/**
 * Returns a localized path given an internal route.
 * @param path Internal route starting with '/' (e.g. '/party-side' or '/')
 * @param targetLocale 'it' or 'en'
 */
export function getLocalizedPath(path: string, targetLocale: Locale): string {
  // Normalize path
  let cleanPath = path;
  if (cleanPath.startsWith('/en/')) {
    cleanPath = cleanPath.slice(3);
  } else if (cleanPath === '/en') {
    cleanPath = '/';
  }

  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  if (targetLocale === 'en') {
    return cleanPath === '/' ? '/en' : `/en${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Given a URL pathname from Astro.url.pathname, switches to targetLocale preserving the route.
 */
export function switchLocalePath(currentPathname: string, targetLocale: Locale): string {
  return getLocalizedPath(currentPathname, targetLocale);
}
