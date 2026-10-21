import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeBase from './src/lib/rehype-base.mjs';
import remarkCitations from './src/lib/remark-citations.mjs';
import rehypePost from './src/lib/rehype-post.mjs';
import legacy from './integrations/legacy.mjs';

// SITE_PREVIEW=1 builds the online preview: served under /website-preview/,
// output in dist-preview/, marked noindex. The real build keeps the root path.
const preview = process.env.SITE_PREVIEW === '1';
const base = preview ? '/website-preview' : '';

export default defineConfig({
  site: 'https://alishdipani.github.io',
  base: base || undefined,
  outDir: preview ? './dist-preview' : './dist',
  // Separate cache: rendered Markdown is cached and would otherwise leak between the two builds.
  cacheDir: preview ? './node_modules/.astro-preview' : './node_modules/.astro',
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
  integrations: [mdx(), legacy()],
});
