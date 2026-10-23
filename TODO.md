# Open items

Things only Alish can provide or decide, and where each one goes. The site hides empty sections
instead of showing placeholders, so nothing here is visible on the site until it's filled in.

## Content
- **Internships line on Home:** update or remove "Actively looking for research internships in Summer and/or Fall 2027."
  → `internships` constant in `src/pages/index.astro`
- **Write the "Why AI safety?" post** (listed, says "Coming soon" until then). → `src/content/blog/why-ai-safety.mdx`
- **News items:** date, text, optional link; Home shows the latest 5 and hides the section while empty.
  → `src/data/news.yml`
- **Publication summaries:** one line per publication (`summary`), optional. All entries that have a
  link online now have one (Task 7); the others stay without links by Alish's choice.
  → `src/data/publications.bib` (fields documented at its top)
- **Current CV PDF:** add the file and point the CV links at it (still the Aug 2024 Google Drive PDF).
  → `public/` + `cvPdf` in `src/pages/cv.astro` (Home no longer links the CV; it's in the header nav)
- **CV page content** beyond the PDF link, if wanted. → `src/pages/cv.astro`
- **VSS 2026 poster link:** not online yet; add `url` to `dipani2026categoryvss` in `src/data/publications.bib`
  once VSS posts it (or once the abstract is in Journal of Vision).

## Setup
- **Google Analytics:** Alish will set up a new ID later (don't reuse the old one).
- **Online preview auto-update:** the repo `alishdipani/website-preview` exists, its Pages source is `gh-pages`
  and it serves a manual snapshot. Still missing: a write deploy key on website-preview and the secret
  `PREVIEW_DEPLOY_KEY` in alishdipani.github.io, so `.github/workflows/preview.yml` can publish on every push to v2.

## Optional
- **NGC check pass:** stopped at 1,130 of 3,868 candidates (roughly NGC 1–1900); resume with
  `npm run ngc -- check` to widen the list, then `npm run ngc -- build`.
- **Publication classification:** VSS 2025, AvaTr and MediaEval 2020 are set explicitly with `group`;
  revisit if needed.
