import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('/sitemap-index.xml', site ?? 'https://podadj.it').href;
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /wip/',
    'Disallow: /en/wip/',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
