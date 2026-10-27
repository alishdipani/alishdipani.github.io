// Rehype plugin: prefix root-relative href/src in Markdown ("/blog/…") with the
// base path, so post links and images also work if the site is served under a sub-path.
function walk(node, base) {
  if (node.type === 'element' && node.properties) {
    for (const attr of ['href', 'src']) {
      const v = node.properties[attr];
      if (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')) node.properties[attr] = base + v;
    }
  }
  // Inline HTML in Markdown (e.g. <img src="/blog/…">) stays a raw string.
  if (node.type === 'raw') node.value = node.value.replace(/\b(href|src)=(["'])\/(?!\/)/g, `$1=$2${base}/`);
  for (const child of node.children ?? []) walk(child, base);
}

export default function rehypeBase({ base = '' } = {}) {
  return (tree) => {
    if (base) walk(tree, base);
  };
}
