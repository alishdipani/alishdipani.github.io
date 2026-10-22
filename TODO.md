# Open items

Things only Alish can provide or decide, and where each one goes. The site hides empty sections
instead of showing placeholders, so nothing here is visible on the site until it's filled in.

## Content
- **Home blurb, past places:** confirm the Northeastern University role/lab; add earlier places and undergrad.
  → `src/pages/index.astro` (position paragraph)
- **Overview image:** add the image and set `overviewImage` (src, alt). → `src/pages/index.astro`, image in `public/`
- **News items:** date, text, optional link; Home shows the latest 5 and hides the section while empty.
  → `src/data/news.yml`
- **NGC post intro:** the text before "The NGCs so far". → `src/content/blog/ngc.mdx`
- **Publication summaries:** one line per publication (`summary`), optional. All entries that have a
  link online now have one (Task 7); the others stay without links by Alish's choice.
  → `src/data/publications.bib` (fields documented at its top)
- **Current CV PDF:** add the file and point the CV links at it (still the Aug 2024 Google Drive PDF).
  → `public/` + `cvPdf` in `src/pages/index.astro` and `src/pages/cv.astro`
- **CV page content** beyond the PDF link, if wanted. → `src/pages/cv.astro`
- **Site description** (search results / link previews). → `SITE.description` in `src/lib/site.ts`

## Setup
- **Google Analytics:** Task 7 (needs Alish's account decision; the old site used G-2TPX3E1SKE).
- **Online preview:** create `alishdipani/website-preview`, add a deploy key, store it as the
  `PREVIEW_DEPLOY_KEY` secret, set its Pages source to `gh-pages`. The workflow is ready:
  `.github/workflows/preview.yml`.

## Optional
- **NGC check pass:** stopped at 1,130 of 3,868 candidates (roughly NGC 1–1900); resume with
  `npm run ngc -- check` to widen the list, then `npm run ngc -- build`.
- **Publication classification:** VSS 2025, AvaTr and MediaEval 2020 are set explicitly with `group`;
  revisit if needed.
