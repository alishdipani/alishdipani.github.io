// Meta description for a post without a `description`: the start of its first prose paragraph
// (about 150 characters), with Markdown/MDX syntax stripped. Decision Oct 21 16:37.
export function excerpt(body = '', max = 150): string | undefined {
  const blocks = body
    .replace(/^##+\s*(Credits|References|Acknowledg\w*)\b[\s\S]*$/im, '') // back matter isn't a summary
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, '') // display math
    .split(/\n\s*\n/)
    .map((b) => b.trim());
  const para = blocks.find(
    (b) => b && !/^(import |export |#|<|\||!\[|\* |- |\d+\. |>|\[\^|\{)/.test(b),
  );
  if (!para) return undefined;
  const text = para
    .replace(/<[^>]+>/g, '') // inline HTML / components
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/\[\^[^\]]*\]|\[@[^\]]*\]/g, '') // footnote refs, citations
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}
