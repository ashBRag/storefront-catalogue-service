import type { Enquiry } from '../domain/enquiry.ts';
import type { Product } from '../domain/product.ts';

export interface EnquiryEmailContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/**
 * Builds the sales email. Pure. User content is HTML-escaped in the HTML body,
 * and anything that goes into a header (the subject) has line breaks removed.
 */
export function buildEnquiryEmail(enquiry: Enquiry, product: Product): EnquiryEmailContent {
  const rows = detailRows(enquiry, product);
  return {
    subject: singleLine(`Product enquiry: ${product.title} (#${product.id})`),
    text: [...rows.map(([label, value]) => `${label}: ${value}`), '', 'Message:', enquiry.message].join('\n'),
    html: [
      '<table>',
      ...rows.map(([label, value]) => `<tr><th align="left">${label}</th><td>${escapeHtml(value)}</td></tr>`),
      '</table>',
      `<p><strong>Message</strong></p><p style="white-space: pre-wrap">${escapeHtml(enquiry.message)}</p>`,
    ].join('\n'),
  };
}

function detailRows(enquiry: Enquiry, product: Product): [string, string][] {
  return [
    ['Product', product.title],
    ['Product ID', String(product.id)],
    ['Price', product.price.toFixed(2)],
    ['Customer name', enquiry.name],
    ['Customer email', enquiry.email],
    ['Customer phone', enquiry.phone ?? 'not given'],
  ];
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Replaces CR/LF (and other line separators) with spaces so a value can't add email headers. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}
