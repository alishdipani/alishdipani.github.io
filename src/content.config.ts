import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    draft: z.boolean().default(false),
    // Built and reachable by URL, but not listed anywhere and marked noindex.
    unlisted: z.boolean().default(false),
    // Path to the post's .bib file, relative to the post (see src/lib/remark-citations.mjs).
    bibliography: z.string().optional(),
    // The post's NGC header image.
    ngc: z
      .object({
        name: z.string(),
        image: z.string(),
        description: z.string(),
        credit: z.string(),
        creditUrl: z.string().url(),
        objectUrl: z.string().url(),
      })
      .optional(),
  }),
});

export const collections = { blog };
