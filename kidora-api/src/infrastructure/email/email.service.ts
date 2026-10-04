import { Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  orgRequestTemplate,
  subscriptionSuccessTemplate,
  verificationCodeTemplate,
  welcomeTemplate,
} from './templates';

@Injectable()
export class EmailService implements OnApplicationBootstrap {
  private logger = new Logger('Email');
  private transporter: nodemailer.Transporter;
  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('mail.host'),
      port: config.get('mail.port'),
      secure: config.get('mail.secure'),
      auth: config.get('mail.user') ? { user: config.get('mail.user'), pass: config.get('mail.pass') } : undefined,
      // Without these a wrong host or a blocked port held the sign-up request
      // open for two minutes before anything was reported.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Checks the SMTP login once at boot and says what is wrong, so "the code
   * never arrived" is answered in the log before anyone signs up. Never
   * blocks startup.
   */
  onApplicationBootstrap() {
    const where = `${this.config.get('mail.host')}:${this.config.get('mail.port')}`;
    void this.transporter.verify().then(
      () => this.logger.log(`SMTP ${where}: connected, sending from ${this.config.get('mail.from')}`),
      (e: unknown) => this.logger.warn(`SMTP ${where}: NOT working: ${EmailService.explain(e)}`),
    );
  }

  /** An SMTP failure in words an operator can act on. */
  static explain(e: unknown): string {
    const err = e as { code?: string; responseCode?: number; message?: string };
    const msg = err.message ?? String(e);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return `login refused (${msg}). For Gmail, SMTP_PASS must be a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords), not your normal password.`;
    }
    if (err.code === 'ECONNREFUSED') return `nothing is listening there (${msg}). Check SMTP_HOST / SMTP_PORT, or start MailHog for local testing.`;
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNECTION' || err.code === 'ESOCKET') {
      return `could not connect (${msg}). Check SMTP_HOST / SMTP_PORT; use 465 (SSL) or 587 (STARTTLS). Some networks block outgoing SMTP.`;
    }
    if (err.code === 'EDNS' || /ENOTFOUND/.test(msg)) return `unknown host (${msg}). Check SMTP_HOST.`;
    return msg;
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.config.get('mail.from'), to, subject, html });
    } catch (e) {
      this.logger.warn(`Email to ${to} failed: ${EmailService.explain(e)}`);
    }
  }

  /**
   * The email verification code. Unlike the notifications above, a failure
   * here matters: the person is waiting on this message to finish signing up.
   *
   * In production a failed send is an error the caller sees. In development
   * (usually no SMTP server on localhost:1025) the code is written to the
   * server log instead, so sign-up can be tried offline — it is never sent
   * back to the browser.
   */
  async sendVerificationCode(to: string, name: string, code: string, minutes: number, purpose: 'verify' | 'reset' = 'verify') {
    const reset = purpose === 'reset';
    const subject = reset ? `${code} is your Kidora password reset code` : `${code} is your Kidora verification code`;
    const text =
      `Hi ${name},\n\nYour Kidora ${reset ? 'password reset' : 'verification'} code is ${code}. It expires in ${minutes} minutes.\n\n` +
      "If you didn't ask for it, you can ignore this email. Kidora will never ask you for this code.";
    try {
      await this.transporter.sendMail({
        from: this.config.get('mail.from'),
        to,
        subject,
        text,
        html: verificationCodeTemplate(name, code, minutes, purpose),
      });
      return { dev: false };
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(`Verification email to ${to} failed: ${EmailService.explain(e)}`);
        throw new ServiceUnavailableException("We couldn't send the verification email. Please try again in a moment.");
      }
      this.logger.warn(`Email not sent (${EmailService.explain(e)}). [DEV EMAIL] code for ${to}: ${code}`);
      return { dev: true };
    }
  }

  sendWelcome(to: string, name: string) {
    return this.send(to, 'Welcome to Kidora! 🎉', welcomeTemplate(name));
  }

  // Sent when a school / district access request is submitted or decided.
  sendOrgRequestUpdate(to: string, name: string, title: string, body: string) {
    return this.send(to, `${title} · Kidora`, orgRequestTemplate(name, title, body));
  }

  // Sent by the payment webhook after a successful subscription.
  sendSubscriptionSuccess(to: string, name: string, plan: string) {
    return this.send(to, 'Your Kidora subscription is active ✅', subscriptionSuccessTemplate(name, plan));
  }
}
