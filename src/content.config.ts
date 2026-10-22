import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    draft: z.boolean().default(false),
    // Built and reachable by URL, but not listed anywhere and marked noindex.
    unlisted: z.boolean().default(false),
    // Path to the post's .bib file, relative to the post (see src/lib/remark-citations.mjs).
    bibliography: z.string().optional(),
    // The post's NGC object, filled by `npm run ngc -- make NAME --post SLUG` (tools/ngc/).
    ngc: z
      .object({
        // "legacy-surveys": made by tools/ngc (listed on the NGC page grid); "manual": a one-off image
        // with its own credit (e.g. the Milky Way on the NGC post), left out of the grid and ngc-list.json.
        source: z.enum(['legacy-surveys', 'manual']).default('legacy-surveys'),
        name: z.string(),
        image: z.string(),           // square post image
        thumb: z.string().optional(),  // 112 px square, shown at ~56 px in post lists
        medium: z.string().optional(), // 320 px square, shown at ~160 px on the NGC page
        type: z.string().optional(),   // e.g. "Barred spiral galaxy"
        description: z.string(),
        credit: z.string(),
        creditUrl: z.string().url(),
        creditLabel: z.string().optional(),     // footer label (default: "<name> image")
        creditLinkText: z.string().optional(),  // only this leading part of the credit is linked (default: all)
        objectUrl: z.string().url(),
        captionUrl: z.string().url().optional(), // where the caption links (default: objectUrl, i.e. Wikipedia or SIMBAD)
        caption: z.string().optional(),          // linked text under the image (default: the name)
        captionPrefix: z.string().optional(),    // an unlinked first caption line above it
      })
      .optional(),
  }),
});

export const collections = { blog };
