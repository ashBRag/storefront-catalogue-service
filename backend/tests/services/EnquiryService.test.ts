import { describe, expect, it } from 'vitest';
import { InMemoryEmailSender } from '../../src/adapters/InMemoryEmailSender.ts';
import { InMemoryProductSource, productFixtures } from '../../src/adapters/InMemoryProductSource.ts';
import { EmailDeliveryError, NotFoundError } from '../../src/domain/errors.ts';
import { EnquiryService } from '../../src/services/EnquiryService.ts';

const enquiry = { productId: 6, name: 'Ann', email: 'ann@example.test', phone: '+61 400 000 000', message: 'Hi' };

function build(products = productFixtures) {
  const sender = new InMemoryEmailSender();
  const service = new EnquiryService(new InMemoryProductSource(products), sender, {
    from: 'catalogue@example.test',
    salesInbox: 'sales@example.test',
  });
  return { service, sender };
}

describe('EnquiryService.submit', () => {
  it('emails the sales inbox with replyTo set to the customer', async () => {
    const { service, sender } = build();
    await service.submit(enquiry);

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toMatchObject({
      to: 'sales@example.test',
      from: 'catalogue@example.test',
      replyTo: 'ann@example.test',
      subject: 'Product enquiry: Test product 6 (#6)',
    });
    expect(sender.sent[0]?.html).toContain('+61 400 000 000');
  });

  it('escapes customer and product text in the HTML body, but keeps the plain-text body literal', async () => {
    const { service, sender } = build([{ ...productFixtures[5]!, title: 'Ring <b>"Gold"</b>' }]);
    await service.submit({ ...enquiry, name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>' });

    const html = sender.sent[0]?.html ?? '';
    expect(html).not.toMatch(/<script|<img|<b>/);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Ring &lt;b&gt;&quot;Gold&quot;&lt;/b&gt;');
    expect(sender.sent[0]?.text).toContain('Customer name: <script>alert(1)</script>');
  });

  it('strips line breaks from the subject and Reply-To so they cannot add email headers', async () => {
    const { service, sender } = build([{ ...productFixtures[5]!, title: 'Ring\r\nBcc: evil@example.test' }]);
    await service.submit({ ...enquiry, email: 'ann@example.test\r\nBcc: evil@example.test' });

    const sent = sender.sent[0];
    expect(sent?.subject).toBe('Product enquiry: Ring Bcc: evil@example.test (#6)');
    expect(sent?.subject).not.toMatch(/[\r\n]/);
    expect(sent?.replyTo).not.toMatch(/[\r\n]/);
  });

  it('throws NotFoundError and sends nothing for an unknown product', async () => {
    const { service, sender } = build();
    await expect(service.submit({ ...enquiry, productId: 999 })).rejects.toBeInstanceOf(NotFoundError);
    expect(sender.sent).toEqual([]);
  });

  it('wraps a sender failure in EmailDeliveryError, keeping the cause', async () => {
    const { service, sender } = build();
    const smtpError = new Error('ECONNREFUSED');
    sender.failWith = smtpError;

    const error = await service.submit(enquiry).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as Error).cause).toBe(smtpError);
  });
});
