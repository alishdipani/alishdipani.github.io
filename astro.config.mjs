import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeBase from './src/lib/rehype-base.mjs';
import remarkCitations from './src/lib/remark-citations.mjs';
import rehypePost from './src/lib/rehype-post.mjs';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import legacy from './integrations/legacy.mjs';

// The site is served at the root of alishdipani.github.io. (A base path still works: url() in
// src/lib/site.ts and the rehype-base plugin prefix links with it.)
const base = '';

// Sitemap (sitemap-index.xml + sitemap-0.xml): real pages only. Left out: the 404 page, feeds and other
// non-page files, unlisted (noindex) posts and the Search Console verification file. Redirect pages
// for old URLs are written by the legacy integration and are never in it.
const unlisted = fs.readdirSync('src/content/blog')
  .filter((f) => /\.mdx?$/.test(f) && /^unlisted:\s*true\s*$/m.test(fs.readFileSync(`src/content/blog/${f}`, 'utf8')))
  .map((f) => `/blog/${f.replace(/^_/, '').replace(/\.mdx?$/, '')}/`);
const inSitemap = (page) => {
  const path = new URL(page).pathname;
  return !/^\/404(\.html|\/)?$/.test(path) && !/\.(xml|txt|html)$/.test(path) && !unlisted.includes(path);
};

export default defineConfig({
  site: 'https://alishdipani.github.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // remark/rehype pipeline (not Sätteri) so posts can use the remark/rehype plugin ecosystem.
    // Old posts use kramdown-style $$…$$ only; a single $ is literal text.
    processor: unified({
      remarkPlugins: [[remarkMath, { singleDollarTextMath: false }], remarkCitations],
      rehypePlugins: [rehypeKatex, rehypeHeadingIds, rehypePost, [rehypeBase, { base }]],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
  integrations: [mdx(), legacy(), sitemap({ filter: inSitemap })],
});
