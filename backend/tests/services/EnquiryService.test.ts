import { describe, expect, it } from 'vitest';
import { InMemoryEmailSender } from '../../src/adapters/InMemoryEmailSender.ts';
import { InMemoryProductSource } from '../../src/adapters/InMemoryProductSource.ts';
import { EmailDeliveryError, NotFoundError } from '../../src/domain/errors.ts';
import { EnquiryService } from '../../src/services/EnquiryService.ts';

const enquiry = { productId: 6, name: 'Ann', email: 'ann@example.test', phone: '+61 400 000 000', message: 'Hi' };

function build() {
  const sender = new InMemoryEmailSender();
  const service = new EnquiryService(new InMemoryProductSource(), sender, {
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
