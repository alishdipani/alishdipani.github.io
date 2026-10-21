import fs from 'node:fs';
import { parse } from '@retorquere/bibtex-parser';

// Publications page data, all from src/data/publications.bib (one entry per item).
// Site fields on top of normal BibTeX (all optional):
//   group    preprint | paper | talk   section; otherwise inferred (see classify)
//   summary  one line shown under Preprints and Papers entries
//   equal    author positions with equal contribution, e.g. {1,2} → marked with *
//   status   e.g. {Under review}, shown after the venue
//   pdf, code, poster, slides   links for the chips (url / doi / arxiv / eprint are standard)
export type Group = 'preprint' | 'paper' | 'talk';

export const GROUPS: { id: Group; title: string }[] = [
  { id: 'preprint', title: 'Preprints' },
  { id: 'paper', title: 'Papers' },
  { id: 'talk', title: 'Talks and posters' },
];

export type Author = { name: string; equal: boolean };

export type Publication = {
  key: string;
  group: Group;
  title: string;
  authors: Author[];
  kind?: 'Poster' | 'Talk';   // for talks and posters, from a "Poster @ …" / "Talk @ …" venue
  venue: string;
  status?: string;
  year: string;
  summary?: string;
  url?: string;               // title link and "Paper" chip: url field, else the DOI
  links: { label: string; href: string }[];
  bibtex: string;             // the entry as BibTeX, without the site-only fields
};

const SITE_FIELDS = ['abbr', 'selected', 'group', 'summary', 'equal', 'status', 'pdf', 'code', 'poster', 'slides'];

const join = (v: unknown) => (Array.isArray(v) ? v.join(' and ') : ((v as string) ?? ''));

// Explicit group wins; "Poster @"/"Talk @" venues are talks; misc/unpublished or preprint servers are
// preprints; everything else (journal articles, conference proceedings such as ICLR/NeurIPS) is a paper.
function classify(type: string, fields: Record<string, any>, venue: string): Group {
  const explicit = join(fields.group).trim();
  if (explicit) {
    if (!GROUPS.some((g) => g.id === explicit)) throw new Error(`publications.bib: unknown group "${explicit}"`);
    return explicit as Group;
  }
  if (/^(Poster|Talk) @/.test(venue)) return 'talk';
  if (['unpublished', 'misc'].includes(type) || /arxiv|biorxiv|psyarxiv|medrxiv|preprint/i.test(venue)) return 'preprint';
  return 'paper';
}

function cleanBibtex(raw: string) {
  const re = new RegExp(`^\\s*(${SITE_FIELDS.join('|')})\\s*=.*\\n`, 'gim');
  return raw.replace(re, '').trim();
}

export function getPublications(file = 'src/data/publications.bib'): Publication[] {
  const lib = parse(fs.readFileSync(file, 'utf8'));
  if (lib.errors.length) throw new Error(`${file}: ${JSON.stringify(lib.errors)}`);
  return lib.entries
    .map((e) => {
      const f = e.fields as Record<string, any>;
      const rawVenue = join(f.journal ?? f.booktitle ?? f.howpublished);
      const equal = new Set(join(f.equal).split(/[,\s]+/).filter(Boolean).map(Number));
      const url = join(f.url) || (f.doi ? `https://doi.org/${join(f.doi)}` : '');
      const arxivId = join(f.arxiv ?? (join(f.archiveprefix).toLowerCase() === 'arxiv' ? f.eprint : ''));
      const arxiv = arxivId && !arxivId.startsWith('http') ? `https://arxiv.org/abs/${arxivId}` : arxivId;
      // Chips, always in this order and only when present.
      const links = [
        ['Paper', url],
        ['PDF', join(f.pdf)],
        ['arXiv', arxiv],
        ['Code', join(f.code)],
        ['Poster', join(f.poster)],
        ['Slides', join(f.slides)],
      ].filter(([, href]) => href).map(([label, href]) => ({ label, href }));
      return {
        key: e.key,
        group: classify(e.type, f, rawVenue),
        title: join(f.title),
        authors: (f.author ?? []).map((a: any, i: number) => ({
          name: a.name ?? [a.firstName, a.prefix, a.lastName].filter(Boolean).join(' '),
          equal: equal.has(i + 1),
        })),
        kind: rawVenue.match(/^(Poster|Talk) @/)?.[1] as Publication['kind'],
        venue: rawVenue.replace(/^(Poster|Talk) @\s*/, ''),
        status: join(f.status) || undefined,
        year: join(f.year),
        summary: join(f.summary) || undefined,
        url: url || undefined,
        links,
        bibtex: cleanBibtex(e.input ?? ''),
      };
    })
    .sort((a, b) => Number(b.year) - Number(a.year));
}
