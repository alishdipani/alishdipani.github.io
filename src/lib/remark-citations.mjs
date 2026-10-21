// Remark plugin: citations from a per-post .bib file.
// A post sets `bibliography: ./refs.bib` (relative to the post) in its frontmatter
// and cites with [@key] or [@key1; @key2]. Citations become numbered links
// (numbered by first use) to an automatic "References" list at the end of the post;
// the hover preview is done in the browser (src/components/HoverCards.astro).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@retorquere/bibtex-parser';

const CITE = /\[(@[\w:.\-/]+(?:\s*;\s*@[\w:.\-/]+)*)\]/g;
const SKIP = new Set(['code', 'inlineCode', 'link', 'linkReference', 'definition', 'html']);

const join = (v) => (Array.isArray(v) ? v.join(' and ') : (v ?? ''));
const initials = (first = '') => first.split(/[\s-]+/).filter(Boolean).map((p) => p[0] + '.').join(' ');

function authorList(authors = []) {
  const names = authors.map((a) => a.name ?? [[a.prefix, a.lastName].filter(Boolean).join(' '), initials(a.firstName)].filter(Boolean).join(', '));
  if (names.length > 3) return `${names[0]} et al.`;
  if (names.length > 1) return `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`;
  return names[0] ?? '';
}

function referenceNodes(entry) {
  const f = entry.fields;
  const venue = join(f.journal ?? f.booktitle ?? f.publisher);
  const text = [
    `${authorList(f.author)} (${join(f.year) || 'n.d.'}).`,
    `${join(f.title)}.`,
    venue && `${venue}.`,
  ].filter(Boolean).join(' ');
  const nodes = [{ type: 'text', value: text + ' ' }];
  const href = f.doi ? `https://doi.org/${join(f.doi)}` : join(f.url);
  if (href) nodes.push({ type: 'link', url: href, children: [{ type: 'text', value: f.doi ? 'doi' : 'link' }] });
  return nodes;
}

function loadBib(file) {
  const fm = file.data?.astro?.frontmatter ?? {};
  if (!fm.bibliography) return null;
  const base = file.path ? path.dirname(file.path) : path.resolve('src/content/blog');
  const bibPath = path.resolve(base, fm.bibliography);
  const lib = parse(fs.readFileSync(bibPath, 'utf8'), { sentenceCase: false }); // keep titles as entered
  if (lib.errors.length) throw new Error(`${bibPath}: ${JSON.stringify(lib.errors)}`);
  return { bibPath, entries: new Map(lib.entries.map((e) => [e.key, e])) };
}

function citeNodes(keys, order, entries, bibPath) {
  const group = { type: 'citations', data: { hName: 'span', hProperties: { className: ['citations'] } }, children: [] };
  group.children.push({ type: 'text', value: '[' });
  keys.forEach((key, i) => {
    if (!entries.has(key)) throw new Error(`citation [@${key}] not found in ${bibPath}`);
    if (!order.includes(key)) order.push(key);
    if (i > 0) group.children.push({ type: 'text', value: ', ' });
    group.children.push({
      type: 'link',
      url: `#ref-${key}`,
      data: { hProperties: { className: ['citation'] } },
      children: [{ type: 'text', value: String(order.indexOf(key) + 1) }],
    });
  });
  group.children.push({ type: 'text', value: ']' });
  return group;
}

function walk(node, visit) {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (SKIP.has(child.type)) continue;
    if (child.type === 'text') {
      const replaced = visit(child);
      if (replaced) {
        node.children.splice(i, 1, ...replaced);
        i += replaced.length - 1;
      }
    } else walk(child, visit);
  }
}

export default function remarkCitations() {
  return (tree, file) => {
    const bib = loadBib(file);
    if (!bib) return;
    const order = [];
    walk(tree, (textNode) => {
      const value = textNode.value;
      if (!CITE.test(value)) return null;
      CITE.lastIndex = 0;
      const out = [];
      let last = 0;
      for (const m of value.matchAll(CITE)) {
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        const keys = m[1].split(';').map((k) => k.trim().slice(1));
        out.push(citeNodes(keys, order, bib.entries, bib.bibPath));
        last = m.index + m[0].length;
      }
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
      return out;
    });
    if (!order.length) return;
    tree.children.push(
      {
        type: 'heading',
        depth: 2,
        data: { hProperties: { id: 'bib-references', className: ['references-heading'] } },
        children: [{ type: 'text', value: 'References' }],
      },
      {
        type: 'list',
        ordered: true,
        spread: false,
        data: { hProperties: { className: ['references'] } },
        children: order.map((key) => ({
          type: 'listItem',
          spread: false,
          data: { hProperties: { id: `ref-${key}` } },
          children: [{ type: 'paragraph', children: referenceNodes(bib.entries.get(key)) }],
        })),
      },
    );
  };
}
