# alishdipani.github.io — v2

New personal site, built from scratch with Astro (static output). Work happens on the `v2` branch; `master` + `gh-pages` are the old al-folio site and stay live until Alish says "launch".

**Instructions live in the Notion Command Center:** https://app.notion.com/p/40018428a0a48088bdc7c3bd39155e0f — read its Site brief, Rules for Claude Code, and the newest Task in the Log before working. Post Reports there.

Key rules (full list on that page): **Alish approves every commit** — before committing, give him a short summary, `git diff --stat` and the local preview URL in the Claude Code chat, and wait for his OK. Only commit/push to `v2`, never force-push or rewrite history; commit messages describe the change (no task numbers). Never invent content about Alish (use a visible `TODO(Alish): …` placeholder); stop and ask before anything that changes the live site, deletes old content, costs money/needs an account, or is public wording about Alish.

## Commands
- `npm run dev` — dev server; also serves `legacy/` and the old post images at `/blog/resources/` (redirect pages only exist in builds). Restart it after changing `src/content.config.ts` or `astro.config.mjs`.
- `npm run build` — build to `dist/`
- `npm run preview` — serve `dist/` like GitHub Pages at http://127.0.0.1:4321/
- `npm run check:urls` — build + verify every old URL still works; must pass before reporting
- `npm run build:preview` — preview build under `/website-preview/` (noindex) into `dist-preview/`
- `npm run check:links` — crawl both builds for broken internal links and missing images, fail on raw.githubusercontent.com hotlinks (needs both builds; add `--external` to also check third-party images)
- `node scripts/serve.mjs 4322 dist-preview /website-preview` — serve the preview build locally
- `npm run screenshots -- docs/screenshots/<task>` — desktop/phone screenshots + console-error and 404-fallback checks (needs a build and Google Chrome)

## Layout
- `src/pages/` — Home, Publications, Blog (+ posts), CV, 404, feed.xml, sitemap.xml
- `src/content/blog/` — posts (Markdown/MDX); URL is `/blog/<filename>/`
- `src/data/publications.bib` — publication list and page data: optional `group={publication|presentation}`, `status` (marks a preprint), `summary`, `equal={1,2}`, link fields (`url`/`doi`, `pdf`, `arxiv`, `code`, `poster`, `slides`); see the comment at its top and `src/lib/publications.ts`
- `src/data/news.yml` — Home news items (date, text, optional link); Home shows the latest 5
- `migration/old-urls.txt` — every URL of the old site (166); `migration/redirects.yml` — old → new for those that moved
- `legacy/` — old site files (PDFs, images, CSS/JS…) copied into the build at their exact old paths
- `_posts/Resources/` — old post images; kept at this path because old posts link to them via raw.githubusercontent.com/…/master/_posts/Resources/
- `.github/workflows/preview.yml` — deploys the preview build to alishdipani/website-preview on every push to v2; `deploy.yml` — real deploy, manual only until launch
- `src/styles/global.css` — theme (color variables, light/dark toggle + system setting, fonts, spacing scale `--s1…--s4`); `post.css` — post layout (sticky contents ≥62rem, margin notes ≥80rem)
- `TODO.md` — every open item only Alish can fill in, and where it goes (the site hides empty sections instead of showing TODOs)
- `integrations/legacy.mjs` — build step that copies `legacy/` and `_posts/Resources/` and writes the redirect pages

## Writing posts
The style guide is `src/content/blog/_template-demo.mdx` (unlisted, at `/blog/template-demo/`); it uses every element:
- frontmatter: `title`, `date`, optional `description` (meta description; otherwise the start of the first paragraph), `bibliography: ./x.bib`, `ngc: {name, image, description, credit, creditUrl, objectUrl}`, `unlisted: true`
- `##` headings → numbered TOC and section markers; Markdown footnotes `[^1]`; citations `[@key]` from the post's .bib (`src/lib/remark-citations.mjs`)
- MDX components in `src/components/`: `PullQuote`, `Sidenote`, `Figure` (`width="text|wide|full"`), interactive figures in `figures/`
- section markers and heading anchors are added by `src/lib/rehype-post.mjs`

## NGC images (tools/ngc/, never run in CI)
One source (Legacy Surveys DR10 south, `fits-cutout`) and one fixed color recipe (`process()` in `tools/ngc/ngc.py`).
- One-time, already done: `npm run ngc -- candidates`, `check` (cached and resumable, ~1 req/s), `wiki`, `build` (rejects objects whose core saturates to green/cyan: at check size, or when `make` finds it at full size and records it in `cache/render-rejects.json`) → `src/data/ngc-list.json` (committed) + `tools/ngc/out/contact-sheet.html` (local).
- Per post: `npm run ngc -- NGC1300 --post <slug>` writes `public/images/ngc/<id>-{post,medium,thumb}.jpg` (512, 320, 112 px squares), fills the post's `ngc:` frontmatter and marks the object `usedBy` that post; it refuses an object another post uses, or whose full-size image has a saturated core (`--force` overrides).
- Manual exception: the NGC post uses the Milky Way (ESA Gaia EDR3 colour map, square crop, `source: "manual"` in its frontmatter with its own `credit`/`captionUrl`; CC BY-SA 3.0 IGO). It's not in `ngc-list.json` or the grid; don't run `make` on that post. Footer credits come from `imageCredits()` in `src/lib/site.ts`.
- Image credit must stay exactly "Legacy Surveys / D. Lang (Perimeter Institute)" with a link (CC BY 4.0 terms); the NGC post (`src/content/blog/ngc.mdx`, `/blog/ngc/`) carries the full credits (Legacy Surveys, OpenNGC CC BY-SA 4.0) and the grid (`NgcGrid`).
- `tools/ngc/.venv/`, `cache/` (FITS, ~1.2 GB) and `out/` are gitignored; delete `cache/` to free space.
