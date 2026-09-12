import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS, type Document } from '@contentful/rich-text-types';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Contentful rich text -> HTML. Emits classes rather than inline styles; the
 * matching rules live in global.css under .contentful-content.
 */
export function renderRichText(document: Document | null | undefined): string {
  if (!document) return '';

  return documentToHtmlString(document, {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const asset = (node as any).data?.target;
        const file = asset?.fields?.file;
        if (!file?.url) return '';
        const src = file.url.startsWith('//') ? `https:${file.url}` : file.url;
        const alt = escapeHtml(asset.fields.title ?? '');
        return `<figure class="rt-figure"><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" /></figure>`;
      },
      [BLOCKS.HEADING_2]: (node, next) =>
        `<h2 class="rt-heading">${next(node.content)}</h2>`,
    },
  });
}
