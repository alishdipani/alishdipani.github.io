# alishdipani.github.io — v2

New personal site, built from scratch with Astro (static output). Work happens on the `v2` branch; `master` + `gh-pages` are the old al-folio site and stay live until Alish says "launch".

**Instructions live in the Notion Command Center:** https://app.notion.com/p/40018428a0a48088bdc7c3bd39155e0f — read its Site brief, Rules for Claude Code, and the newest Task in the Log before working. Post Reports there.

Key rules (full list on that page): **Alish approves every commit** — before committing, give him a short summary, `git diff --stat` and the local preview URL in the Claude Code chat, and wait for his OK. Only commit/push to `v2`, never force-push or rewrite history; commit messages describe the change (no task numbers). Never invent content about Alish (use a visible `TODO(Alish): …` placeholder); stop and ask before anything that changes the live site, deletes old content, costs money/needs an account, or is public wording about Alish.

## Commands
- `npm run dev` — dev server (legacy files and redirect pages only exist in builds)
- `npm run build` — build to `dist/`
- `npm run preview` — serve `dist/` like GitHub Pages at http://127.0.0.1:4321/
- `npm run check:urls` — build + verify every old URL still works; must pass before reporting
- `npm run build:preview` — preview build under `/website-preview/` (noindex) into `dist-preview/`
- `npm run check:links` — crawl both builds for broken internal links (needs both builds)
- `node scripts/serve.mjs 4322 dist-preview /website-preview` — serve the preview build locally
- `npm run screenshots -- docs/screenshots/<task>` — desktop/phone screenshots + console-error and 404-fallback checks (needs a build and Google Chrome)

## Layout
- `src/pages/` — Home, Publications, Blog (+ posts), CV, 404, feed.xml, sitemap.xml
- `src/content/blog/` — posts (Markdown/MDX); URL is `/blog/<filename>/`
- `src/data/publications.bib` — publication list
- `migration/old-urls.txt` — every URL of the old site (166); `migration/redirects.yml` — old → new for those that moved
- `legacy/` — old site files (PDFs, images, CSS/JS…) copied into the build at their exact old paths
- `_posts/Resources/` — old post images; kept at this path because old posts link to them via raw.githubusercontent.com/…/master/_posts/Resources/
- `.github/workflows/preview.yml` — deploys the preview build to alishdipani/website-preview on every push to v2; `deploy.yml` — real deploy, manual only until launch
- `src/styles/global.css` — theme (color variables, light + dark via prefers-color-scheme, fonts); `post.css` — post layout
- `integrations/legacy.mjs` — build step that copies `legacy/` and `_posts/Resources/` and writes the redirect pages

## Writing posts
The style guide is `src/content/blog/_template-demo.mdx` (unlisted, at `/blog/template-demo/`); it uses every element:
- frontmatter: `title`, `date`, optional `subtitle`, `description`, `bibliography: ./x.bib`, `ngc: {name, image, description, credit, creditUrl, objectUrl}`, `unlisted: true`
- `##` headings → numbered TOC and section markers; Markdown footnotes `[^1]`; citations `[@key]` from the post's .bib (`src/lib/remark-citations.mjs`)
- MDX components in `src/components/`: `PullQuote`, `Sidenote`, `Figure` (`width="text|wide|full"`), interactive figures in `figures/`
- section markers, heading anchors and the ∎ end mark are added by `src/lib/rehype-post.mjs`
