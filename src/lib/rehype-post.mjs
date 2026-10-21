// Rehype plugin for blog posts (runs after heading ids are assigned):
// - a section marker ("01 / 05") before every ## section heading,
// - an anchor link on every ## and ### heading.
// Footnotes and References are not counted as sections.
const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const classes = (node) => [].concat(node.properties?.className ?? []);
const isBackMatter = (node) =>
  node.type === 'element' &&
  (classes(node).includes('footnotes') || classes(node).includes('references') ||
    classes(node).includes('references-heading') || node.properties?.id === 'footnote-label');

function collect(node, test, out = [], parent = null) {
  for (const child of node.children ?? []) {
    if (isBackMatter(child)) continue;
    if (test(child)) out.push({ node: child, parent });
    collect(child, test, out, child);
  }
  return out;
}

export default function rehypePost() {
  return (tree) => {
    const sections = collect(tree, (n) => n.type === 'element' && n.tagName === 'h2');
    const total = String(sections.length).padStart(2, '0');
    sections.forEach(({ node, parent }, i) => {
      const siblings = (parent ?? tree).children;
      const marker = el('p', { className: ['section-marker'], ariaHidden: 'true' }, [
        text(`${String(i + 1).padStart(2, '0')} / ${total}`),
      ]);
      siblings.splice(siblings.indexOf(node), 0, marker);
    });

    for (const { node } of collect(tree, (n) => n.type === 'element' && (n.tagName === 'h2' || n.tagName === 'h3'))) {
      const id = node.properties?.id;
      if (!id) continue;
      node.children.push(el('a', { className: ['heading-anchor'], href: `#${id}`, ariaLabel: 'Link to this section' }, [text('#')]));
    }
  };
}
