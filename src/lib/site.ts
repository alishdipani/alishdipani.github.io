import { getCollection } from 'astro:content';

export const SITE = {
  name: 'Alish Dipani',
  description: 'Personal website of Alish Dipani.', // TODO(Alish): site description
};

// '' for the real site, '/website-preview' for the preview build (see astro.config.mjs).
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const PREVIEW = BASE !== '';

// Prefix a root-relative path ('/blog/') with the base path.
export const url = (path: string) => BASE + path;

// Paths are root-relative; wrap them in url() when linking.
export const NAV = [
  { href: '/', label: 'Home' },
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
