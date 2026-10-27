# Open items

Things only Alish can provide or decide, and where each one goes. The site hides empty sections
instead of showing placeholders, so nothing here is visible on the site until it's filled in.

## Content
- **Internships line on Home:** update or remove "Actively looking for research internships in Summer and/or Fall 2027."
  → `internships` constant in `src/pages/index.astro`

## Setup
- **Google Analytics / analytics (needs Alish's decision, then a short task for Claude Code):** nothing is wired in yet.
  GA4 with consent denied by default and no banner ("option B") would likely leave the reports empty on a small
  site: Google only reports or models declined visits with at least 1,000 events a day from declined visitors for
  7 days and at least 1,000 daily consented users (https://support.google.com/analytics/answer/11161109).
  Options left: A, GA4 with cookies on and no banner; C, GA4 with a consent banner; or a cookie-free tool (Umami
  Cloud or GoatCounter). Alish picks; then he (or Claude in Chrome) creates a NEW GA4 property and web data stream
  (never reuse the old ID), Google signals off, data retention 14 months, links Search Console, and sends the
  Measurement ID. Planned site work once chosen: the tag loads only on the production hostname (never the preview
  or localhost); opt-out for Alish's own visits via a `?notrack` flag kept in localStorage; events for scroll depth
  (25/50/75/100), blog section reached, CV opened, email copied and publication link clicks; optionally a one-line
  privacy note (Alish writes the wording).

## Optional
- **NGC check pass:** stopped at 1,130 of 3,868 candidates (roughly NGC 1–1900); resume with
  `npm run ngc -- check` to widen the list, then `npm run ngc -- build`.
- **Publication classification:** VSS 2025, AvaTr and MediaEval 2020 are set explicitly with `group`;
  revisit if needed.
