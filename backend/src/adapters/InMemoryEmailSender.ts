import type { EmailMessage, EmailSender } from '../ports/EmailSender.ts';

/** Records messages instead of sending them. Set `failWith` to simulate a provider failure. */
export class InMemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  failWith: Error | undefined;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith !== undefined) throw this.failWith;
    this.sent.push(message);
  }
}
