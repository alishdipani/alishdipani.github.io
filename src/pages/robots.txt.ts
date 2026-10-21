// robots.txt: the real site allows everything; the preview build disallows everything.
import type { APIContext } from 'astro';
import { PREVIEW, url } from '../lib/site';

export function GET(context: APIContext) {
  const body = PREVIEW
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL(url('/sitemap.xml'), context.site)}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
