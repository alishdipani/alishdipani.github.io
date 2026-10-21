import fs from 'node:fs';
import { parse } from '@retorquere/bibtex-parser';

export type Publication = {
  key: string;
  title: string;
  authors: string[];
  venue: string;
  year: string;
  abbr?: string;
};

const join = (v: unknown) => (Array.isArray(v) ? v.join(' and ') : ((v as string) ?? ''));

export function getPublications(file = 'src/data/publications.bib'): Publication[] {
  const lib = parse(fs.readFileSync(file, 'utf8'));
  if (lib.errors.length) throw new Error(`${file}: ${JSON.stringify(lib.errors)}`);
  return lib.entries
    .map((e) => ({
      key: e.key,
      title: join(e.fields.title),
      authors: (e.fields.author ?? []).map((a: any) => a.name ?? [a.firstName, a.lastName].filter(Boolean).join(' ')),
      venue: join(e.fields.journal ?? e.fields.booktitle),
      year: join(e.fields.year),
      abbr: e.fields.abbr ? join(e.fields.abbr) : undefined,
    }))
    .sort((a, b) => Number(b.year) - Number(a.year));
}
