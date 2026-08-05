import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { subscriptionSuccessTemplate, welcomeTemplate } from './templates';

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

  sendWelcome(to: string, name: string) {
    return this.send(to, 'Welcome to Kidora! 🎉', welcomeTemplate(name));
  }

  // Sent by the payment webhook after a successful subscription.
  sendSubscriptionSuccess(to: string, name: string, plan: string) {
    return this.send(to, 'Your Kidora subscription is active ✅', subscriptionSuccessTemplate(name, plan));
  }
}
