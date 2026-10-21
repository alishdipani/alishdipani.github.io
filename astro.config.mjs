import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import legacy from './integrations/legacy.mjs';

export default defineConfig({
  site: 'https://alishdipani.github.io',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // remark/rehype pipeline (not Sätteri) so posts can use the remark/rehype plugin ecosystem.
    // Old posts use kramdown-style $$…$$ only; a single $ is literal text.
    processor: unified({
      remarkPlugins: [[remarkMath, { singleDollarTextMath: false }]],
      rehypePlugins: [rehypeKatex],
    }),
  },
  integrations: [mdx(), legacy()],
});
