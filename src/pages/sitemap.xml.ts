// /sitemap.xml was the old site's sitemap address, so it keeps working: it is now a sitemap index that
// points to the sitemap made by @astrojs/sitemap (sitemap-0.xml, the same as /sitemap-index.xml).
import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${new URL('/sitemap-0.xml', context.site)}</loc></sitemap>
</sitemapindex>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
