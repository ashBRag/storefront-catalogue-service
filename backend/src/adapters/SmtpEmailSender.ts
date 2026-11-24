import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from '../ports/EmailSender.ts';

export interface SmtpOptions {
  readonly host: string;
  readonly port: number;
  readonly auth: { readonly user: string; readonly pass: string } | undefined;
}

/** Fail fast instead of nodemailer's 2-minute default; the customer is waiting on this. */
const CONNECTION_TIMEOUT_MS = 5_000;
const SOCKET_TIMEOUT_MS = 10_000;

/** Sends email over SMTP (Mailpit locally; any SMTP provider, e.g. SES SMTP, in production). */
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(options: SmtpOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      // Implicit TLS on 465; otherwise STARTTLS is used if the server offers it.
      secure: options.port === 465,
      auth: options.auth === undefined ? undefined : { user: options.auth.user, pass: options.auth.pass },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ ...message });
  }
}
