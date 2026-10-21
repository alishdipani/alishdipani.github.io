// Sitemap of the new site's pages (redirect pages are left out on purpose).
import type { APIContext } from 'astro';
import { getPosts, NAV, url } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  const paths = ['/', ...NAV.map((n) => n.href), ...posts.map((p) => `/blog/${p.id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(url(p), context.site)}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
