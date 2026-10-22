import fs from 'node:fs';
import { parse } from '@retorquere/bibtex-parser';

// Publications page data, all from src/data/publications.bib (one entry per item).
// Site fields on top of normal BibTeX (all optional):
//   group    publication | presentation   section; otherwise inferred (see classify)
//   status   e.g. {Preprint}, {Report}: the label shown after the venue (also marks a preprint)
//   summary  one line shown under Publications entries
//   equal    author positions with equal contribution, e.g. {1,2} → marked with *
//   pdf, code, poster, slides   links for the chips (url / doi / arxiv / eprint are standard)
export type Group = 'publication' | 'presentation';

export const GROUPS: { id: Group; title: string }[] = [
  { id: 'publication', title: 'Publications' },
  { id: 'presentation', title: 'Presentations' },
];

export type Author = {
  name: string;  // "Alish Dipani"
  apa: string;   // "Dipani, A."
  equal: boolean;
};

// APA-style name: "Last, F. M." (prefixes kept, e.g. "t Hart, B. M."; single names as they are).
const initials = (first = '') => first.split(/[\s.]+/).filter(Boolean).map((p) => p.split('-').map((q) => q[0] + '.').join('-')).join(' ');
const apaName = (a: any) => {
  const last = [a.prefix, a.lastName].filter(Boolean).join(' ') || a.name || '';
  return a.firstName ? `${last}, ${initials(a.firstName)}` : last;
};

export type Publication = {
  key: string;
  group: Group;
  title: string;
  authors: Author[];
  kind?: 'Poster' | 'Talk';   // for presentations, from a "Poster @ …" / "Talk @ …" venue
  preprint: boolean;          // publications with a status, or on a preprint server / misc entry
  venue: string;
  status?: string;
  statusUrl?: string;         // links the part of the status after its first comma
  year: string;
  summary?: string;
  url?: string;               // title link and "Paper" chip: url field, else the DOI
  links: { label: string; href: string }[];
  bibtex: string;             // the entry as BibTeX, without the site-only fields
};

const SITE_FIELDS = ['abbr', 'selected', 'group', 'summary', 'equal', 'status', 'statusurl', 'pdf', 'code', 'poster', 'slides'];

const join = (v: unknown) => (Array.isArray(v) ? v.join(' and ') : ((v as string) ?? ''));

// Explicit group wins; "Poster @"/"Talk @" venues are presentations; everything else (journal
// articles, conference proceedings such as ICLR/NeurIPS, preprints) is a publication.
function classify(fields: Record<string, any>, venue: string): Group {
  const explicit = join(fields.group).trim();
  if (explicit) {
    if (!GROUPS.some((g) => g.id === explicit)) throw new Error(`publications.bib: unknown group "${explicit}"`);
    return explicit as Group;
  }
  return /^(Poster|Talk) @/.test(venue) ? 'presentation' : 'publication';
}

const isPreprint = (type: string, fields: Record<string, any>, venue: string) =>
  !!join(fields.status) || ['unpublished', 'misc'].includes(type) || /arxiv|biorxiv|psyarxiv|medrxiv|preprint/i.test(venue);

function cleanBibtex(raw: string) {
  const re = new RegExp(`^\\s*(${SITE_FIELDS.join('|')})\\s*=.*\\n`, 'gim');
  return raw.replace(re, '').trim();
}

export function getPublications(file = 'src/data/publications.bib'): Publication[] {
  const lib = parse(fs.readFileSync(file, 'utf8'), { sentenceCase: false }); // keep titles as entered
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
        group: classify(f, rawVenue),
        title: join(f.title),
        authors: (f.author ?? []).map((a: any, i: number) => ({
          name: a.name ?? [a.firstName, a.prefix, a.lastName].filter(Boolean).join(' '),
          apa: apaName(a),
          equal: equal.has(i + 1),
        })),
        kind: rawVenue.match(/^(Poster|Talk) @/)?.[1] as Publication['kind'],
        preprint: isPreprint(e.type, f, rawVenue),
        venue: rawVenue.replace(/^(Poster|Talk) @\s*/, ''),
        status: join(f.status) || undefined,
        statusUrl: join(f.statusurl) || undefined,
        year: join(f.year),
        summary: join(f.summary) || undefined,
        url: url || undefined,
        links,
        bibtex: cleanBibtex(e.input ?? ''),
      };
    })
    .sort((a, b) => Number(b.year) - Number(a.year));
}
