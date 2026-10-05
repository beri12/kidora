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
    const c = (k: string) => this.config.get(`mail.${k}`);
    const where = `${c('host')}:${c('port')}`;
    // Everything but the password, so a wrong value is visible at a glance.
    this.logger.log(`SMTP configuration detected: host=${c('host')} port=${c('port')} secure=${c('secure')} user=${c('user') || '(none)'} from=${c('from')}`);
    for (const w of EmailService.configWarnings({ host: c('host'), user: c('user'), pass: c('pass'), from: c('from') })) this.logger.warn(w);
    void this.transporter.verify().then(
      () => this.logger.log(`SMTP ${where}: connection OK`),
      (e: unknown) => this.logger.warn(`SMTP ${where}: connection FAILED: ${EmailService.explain(e)}`),
    );
  }

  /**
   * Settings that cannot work, found before the first send. Gmail's
   * "535-5.7.8 Username and Password not accepted" is almost always the
   * normal account password in SMTP_PASS: Gmail only accepts a 16-letter
   * App Password over SMTP. Values are never printed, only what is wrong.
   */
  static configWarnings(m: { host: string; user: string; pass: string; from: string }): string[] {
    const out: string[] = [];
    const local = /^(localhost|127\.0\.0\.1|mailhog)$/i.test(m.host);
    if (local) {
      out.push(`SMTP_HOST=${m.host} is a local test server (MailHog): codes will not reach real inboxes. Set SMTP_HOST=smtp.gmail.com etc. for real email.`);
      return out;
    }
    if (!m.user) out.push('SMTP_USER is missing; most SMTP servers will refuse to send.');
    if (!m.pass) out.push('SMTP_PASS is missing; the server will refuse the login.');
    if (/(^|\.)(gmail|googlemail)\.com$/i.test(m.host)) {
      if (m.pass && !/^[a-z]{16}$/i.test(m.pass)) {
        out.push('SMTP_PASS is not a 16-letter Gmail App Password, so Gmail will answer "535-5.7.8 Username and Password not accepted". Create one at https://myaccount.google.com/apppasswords (2-Step Verification must be on) and paste it into SMTP_PASS.');
      }
      const fromAddr = /<([^>]+)>/.exec(m.from)?.[1] ?? m.from;
      if (m.user && fromAddr.toLowerCase() !== m.user.toLowerCase()) {
        out.push(`MAIL_FROM (${fromAddr}) differs from SMTP_USER; Gmail sends as ${m.user} anyway. Set MAIL_FROM="Kidora <${m.user}>".`);
      }
    }
    return out;
  }

  /**
   * Printing a code instead of sending it is a development convenience only.
   * Besides NODE_ENV=production, a public WEB_URL also rules it out, so a
   * server started without NODE_ENV never writes codes to its logs.
   */
  static devFallbackAllowed(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const web = process.env.WEB_URL?.trim();
    return !web || /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(web);
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
      if (!EmailService.devFallbackAllowed()) {
        // The reason goes to the log, the code never does.
        this.logger.error(`Verification email to ${to} failed: ${EmailService.explain(e)}`);
        throw new ServiceUnavailableException("We couldn't send the verification email. Please try again in a moment.");
      }
      this.logger.error(`Verification email to ${to} FAILED: ${EmailService.explain(e)}`);
      this.logger.warn(`[DEV EMAIL] development fallback, the email was not delivered. Code for ${to}: ${code}`);
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
