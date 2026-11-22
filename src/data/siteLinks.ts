import siteLinksJson from './siteLinks.json';
import type { SiteLinks, SocialLink } from '../schemas/siteLinks';

export type { SiteLinks, SocialLink };

export const siteLinks: SiteLinks = siteLinksJson as SiteLinks;

export function getMailtoHref(subject?: string, body?: string, email: string = siteLinks.email): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return params.length > 0 ? `mailto:${email}?${params.join('&')}` : `mailto:${email}`;
}
