import fs from 'node:fs';
import { parse } from '@retorquere/bibtex-parser';

export type Group = 'preprint' | 'publication' | 'talk';

export const GROUPS: { id: Group; title: string }[] = [
  { id: 'preprint', title: 'Preprints' },
  { id: 'publication', title: 'Publications' },
  { id: 'talk', title: 'Talks and posters' },
];

export type Publication = {
  key: string;
  group: Group;
  title: string;
  authors: string[];
  kind?: 'Poster' | 'Talk';   // for talks and posters, from a "Poster @ …" / "Talk @ …" venue
  venue: string;
  year: string;
  url?: string;               // title link: url field, else the DOI
  links: { label: string; href: string }[];
  bibtex: string;             // the entry as BibTeX, without the site-only fields
};

// Fields used only by this site; left out of the BibTeX shown to readers.
const SITE_FIELDS = ['abbr', 'selected', 'group'];
const LINK_FIELDS: [string, string][] = [['pdf', 'PDF'], ['arxiv', 'arXiv'], ['code', 'Code'], ['poster', 'Poster'], ['slides', 'Slides']];

const join = (v: unknown) => (Array.isArray(v) ? v.join(' and ') : ((v as string) ?? ''));

function classify(type: string, fields: Record<string, any>, venue: string): Group {
  const explicit = join(fields.group).trim() as Group;
  if (explicit) {
    if (!GROUPS.some((g) => g.id === explicit)) throw new Error(`unknown group "${explicit}"`);
    return explicit;
  }
  if (/^(Poster|Talk) @/.test(venue)) return 'talk';
  if (['unpublished', 'misc'].includes(type) || /arxiv|biorxiv|psyarxiv|preprint/i.test(venue)) return 'preprint';
  return 'publication';
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
      const kind = rawVenue.match(/^(Poster|Talk) @/)?.[1] as Publication['kind'];
      const arxiv = join(f.arxiv ?? (join(f.archiveprefix).toLowerCase() === 'arxiv' ? f.eprint : ''));
      const links = LINK_FIELDS.flatMap(([field, label]) => {
        const v = field === 'arxiv' ? arxiv : join(f[field]);
        if (!v) return [];
        return [{ label, href: field === 'arxiv' && !v.startsWith('http') ? `https://arxiv.org/abs/${v}` : v }];
      });
      return {
        key: e.key,
        group: classify(e.type, f, rawVenue),
        title: join(f.title),
        authors: (f.author ?? []).map((a: any) => a.name ?? [a.firstName, a.prefix, a.lastName].filter(Boolean).join(' ')),
        kind,
        venue: rawVenue.replace(/^(Poster|Talk) @\s*/, ''),
        year: join(f.year),
        url: join(f.url) || (f.doi ? `https://doi.org/${join(f.doi)}` : undefined),
        links,
        bibtex: cleanBibtex(e.input ?? ''),
      };
    })
    .sort((a, b) => Number(b.year) - Number(a.year));
}
