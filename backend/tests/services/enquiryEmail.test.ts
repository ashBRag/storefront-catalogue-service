import { describe, expect, it } from 'vitest';
import { productFixtures } from '../../src/adapters/InMemoryProductSource.ts';
import type { Enquiry } from '../../src/domain/enquiry.ts';
import { buildEnquiryEmail, escapeHtml, singleLine } from '../../src/services/enquiryEmail.ts';

const product = { ...productFixtures[0]!, title: 'Lamp <b>"Pro"</b> & co' };
const enquiry: Enquiry = {
  productId: product.id,
  name: '<script>alert(1)</script>',
  email: 'ann@example.test',
  phone: undefined,
  message: "Line one\nIt's <img src=x onerror=alert(1)>",
};

describe('buildEnquiryEmail', () => {
  const email = buildEnquiryEmail(enquiry, product);

  it('puts product title and id in a single-line subject', () => {
    expect(email.subject).toBe(`Product enquiry: ${product.title} (#1)`);
  });

  it('includes product and customer details in the text body', () => {
    expect(email.text).toContain('Product ID: 1');
    expect(email.text).toContain(`Price: ${product.price.toFixed(2)}`);
    expect(email.text).toContain('Customer email: ann@example.test');
    expect(email.text).toContain('Customer phone: not given');
    expect(email.text).toContain(enquiry.message);
  });

  it('escapes all user and upstream content in the HTML body', () => {
    expect(email.html).not.toMatch(/<script|<img|<b>/);
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Lamp &lt;b&gt;&quot;Pro&quot;&lt;/b&gt; &amp; co');
    expect(email.html).toContain('It&#39;s');
  });
});

describe('singleLine', () => {
  it('removes CR/LF so a value cannot add headers', () => {
    expect(singleLine('Lamp\r\nBcc: evil@example.test')).toBe('Lamp Bcc: evil@example.test');
    expect(singleLine('a\u2028b')).toBe('a b');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
