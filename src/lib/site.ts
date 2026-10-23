import { getCollection } from 'astro:content';

export const SITE = {
  name: 'Alish Dipani',
  // Draft wording (Command Center, Oct 22 21:38); Alish still has to confirm it.
  description: 'Alish Dipani is a NeuroAI PhD student at Georgia Tech studying the perceptual and cognitive capabilities of AI systems, and building AI models of the brain.',
  homeTitle: 'Alish Dipani · NeuroAI PhD student at Georgia Tech',
  email: 'alish.dipani@gmail.com',
  x: 'https://x.com/alishdipani',
  // Link preview (Open Graph) image for pages without an NGC image; made by tools/og/make.mjs.
  ogImage: '/images/og-default.png',
};

// '' for the real site, '/website-preview' for the preview build (see astro.config.mjs).
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const PREVIEW = BASE !== '';

// Prefix a root-relative path ('/blog/') with the base path.
export const url = (path: string) => BASE + path;

// Paths are root-relative; wrap them in url() when linking. Home is reached from the
// header's left side ("← Home"), so it isn't in the nav (Task 6).
export const NAV = [
  { href: '/publications/', label: 'Publications' },
  { href: '/blog/', label: 'Blog' },
  { href: '/cv/', label: 'CV' },
];

// Listed posts (blog index, Home, feed, sitemap). Pass { unlisted: true } to also get unlisted ones.
export async function getPosts({ unlisted = false } = {}) {
  const posts = await getCollection('blog', ({ data }) => !data.draft && (unlisted || !data.unlisted));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Footer credit lines for NGC images. The Legacy Surveys wording is required by its CC BY 4.0 license;
// manual images bring their own (exact) credit text.
// linkText: only this leading part of text is linked (default: the whole text).
export type Credit = { label: string; text: string; href: string; linkText?: string };
export const LEGACY_CREDIT: Credit = {
  label: 'NGC images',
  text: 'Legacy Surveys / D. Lang (Perimeter Institute)',
  href: 'https://www.legacysurvey.org/',
};
type NgcData = { source?: string; name: string; credit: string; creditUrl: string; creditLabel?: string; creditLinkText?: string; thumb?: string };
export function imageCredits(ngcs: (NgcData | undefined)[]): Credit[] {
  const credits: Credit[] = [];
  if (ngcs.some((n) => n?.source !== 'manual' && n?.credit.startsWith('Legacy Surveys'))) credits.push(LEGACY_CREDIT);
  for (const n of ngcs) {
    if (n?.source === 'manual' && !credits.some((c) => c.text === n.credit)) {
      credits.push({ label: n.creditLabel ?? `${n.name} image`, text: n.credit, href: n.creditUrl, linkText: n.creditLinkText });
    }
  }
  return credits;
}
