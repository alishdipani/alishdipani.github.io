import { getCollection } from 'astro:content';

export const SITE = {
  name: 'Alish Dipani',
  description: 'Personal website of Alish Dipani.', // TODO(Alish): site description
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/publications/', label: 'Publications' },
  { href: '/blog/', label: 'Blog' },
  { href: '/cv/', label: 'CV' },
];

export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
