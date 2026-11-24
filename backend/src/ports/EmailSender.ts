export interface EmailMessage {
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly replyTo?: string;
}

/**
 * Sends one email. Swapping the provider (e.g. SMTP → SES API) means writing
 * one new implementation of this interface. Rejects if the provider does not
 * accept the message.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
