import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  orgRequestTemplate,
  subscriptionSuccessTemplate,
  verificationCodeTemplate,
  welcomeTemplate,
} from './templates';

@Injectable()
export class EmailService {
  private logger = new Logger('Email');
  private transporter: nodemailer.Transporter;
  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('mail.host'),
      port: config.get('mail.port'),
      secure: false,
      auth: config.get('mail.user') ? { user: config.get('mail.user'), pass: config.get('mail.pass') } : undefined,
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.config.get('mail.from'), to, subject, html });
    } catch (e) {
      this.logger.warn('Email send failed (dev is fine): ' + (e as Error).message);
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
        this.logger.error(`Verification email to ${to} failed: ${(e as Error).message}`);
        throw new ServiceUnavailableException("We couldn't send the verification email. Please try again in a moment.");
      }
      this.logger.warn(`Email is not reachable (${(e as Error).message}). [DEV EMAIL] code for ${to}: ${code}`);
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
