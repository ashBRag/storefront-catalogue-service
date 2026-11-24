import type { Enquiry } from '../domain/enquiry.ts';
import { EmailDeliveryError, NotFoundError } from '../domain/errors.ts';
import type { EmailSender } from '../ports/EmailSender.ts';
import type { ProductSource } from '../ports/ProductSource.ts';
import { buildEnquiryEmail, singleLine } from './enquiryEmail.ts';

export interface EnquiryOptions {
  /** Sender address (MAIL_FROM). */
  readonly from: string;
  /** Where enquiries go (SALES_INBOX). */
  readonly salesInbox: string;
}

/**
 * Emails an enquiry to the sales inbox. Enquiries are not stored anywhere:
 * the email is the only record (a deliberate PoC simplification).
 */
export class EnquiryService {
  private readonly products: ProductSource;
  private readonly email: EmailSender;
  private readonly options: EnquiryOptions;

  constructor(products: ProductSource, email: EmailSender, options: EnquiryOptions) {
    this.products = products;
    this.email = email;
    this.options = options;
  }

  /** Throws NotFoundError for an unknown product, EmailDeliveryError if sending fails. */
  async submit(enquiry: Enquiry): Promise<void> {
    const product = await this.products.getProduct(enquiry.productId);
    if (product === undefined) {
      throw new NotFoundError(`Product ${enquiry.productId} not found`);
    }
    const content = buildEnquiryEmail(enquiry, product);
    try {
      await this.email.send({
        to: this.options.salesInbox,
        from: this.options.from,
        replyTo: singleLine(enquiry.email),
        ...content,
      });
    } catch (error) {
      // Same error for every provider, so HTTP can map it to 502 without knowing the adapter.
      throw new EmailDeliveryError('Failed to send enquiry email', { cause: error });
    }
  }
}
