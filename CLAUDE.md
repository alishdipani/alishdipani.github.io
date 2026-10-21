# alishdipani.github.io — v2

New personal site, built from scratch with Astro (static output). Work happens on the `v2` branch; `master` + `gh-pages` are the old al-folio site and stay live until Alish says "launch".

**Instructions live in the Notion Command Center:** https://app.notion.com/p/40018428a0a48088bdc7c3bd39155e0f — read its Site brief, Rules for Claude Code, and the newest Task in the Log before working. Post Reports there.

Key rules (full list on that page): only commit/push to `v2`, one commit per finished task, never force-push; never invent content about Alish (use a visible `TODO(Alish): …` placeholder); stop and ask before anything that changes the live site, deletes old content, costs money/needs an account, or is public wording about Alish.

## Commands
- `npm run dev` — dev server (legacy files and redirect pages only exist in builds)
- `npm run build` — build to `dist/`
- `npm run preview` — serve `dist/` like GitHub Pages at http://127.0.0.1:4321/
- `npm run check:urls` — build + verify every old URL still works; must pass before reporting
- `npm run screenshots -- docs/screenshots/<task>` — desktop/phone screenshots + console-error and 404-fallback checks (needs a build and Google Chrome)

## Layout
- `src/pages/` — Home, Publications, Blog (+ posts), CV, 404, feed.xml, sitemap.xml
- `src/content/blog/` — posts (Markdown/MDX); URL is `/blog/<filename>/`
- `src/data/publications.bib` — publication list
- `migration/old-urls.txt` — every URL of the old site (166); `migration/redirects.yml` — old → new for those that moved
- `legacy/` — old site files (PDFs, images, CSS/JS…) copied into the build at their exact old paths
- `_posts/Resources/` — old post images; kept at this path because old posts link to them via raw.githubusercontent.com/…/master/_posts/Resources/
- `integrations/legacy.mjs` — build step that copies `legacy/` and `_posts/Resources/` and writes the redirect pages
