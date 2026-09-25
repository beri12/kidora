import { Injectable, Logger } from '@nestjs/common';
import {
  LogSmsProvider,
  SmsDeliveryError,
  SmsProvider,
  TwilioSmsProvider,
  resolveSmsProvider,
} from './providers/sms-provider';

export { SmsDeliveryError } from './providers/sms-provider';

/** How long a one-time code stays valid, in minutes — kept in the SMS copy. */
const OTP_MINUTES = 5;

/**
 * The one place Kidora sends text messages from. Delivery goes through an
 * SmsProvider (see providers/sms-provider.ts), chosen by SMS_PROVIDER.
 *
 * With the provider unconfigured outside production, the message is written
 * to the server log instead, so the flow can be tried offline — the code
 * never goes back to the browser. In production a missing configuration is an
 * error: accepting the request and texting nobody would leave the user
 * waiting for a code that is never coming. SMS_STRICT=true makes development
 * fail the same way.
 */
@Injectable()
export class SmsService {
  private logger = new Logger('SMS');
  private twilio = new TwilioSmsProvider();
  private log = new LogSmsProvider();

  /** Read per call: tests and hot config changes flip the environment. */
  get provider(): SmsProvider {
    return resolveSmsProvider(this.twilio, this.log);
  }

  /** True when the chosen provider can actually deliver a message. */
  get enabled() {
    return this.provider.configured;
  }

  /**
   * E.164 is what Twilio requires: a leading + and 8-15 digits.
   * Local numbers are normalised against SMS_DEFAULT_COUNTRY_CODE (e.g. +251)
   * so a user typing "0912345678" still reaches Twilio in a valid shape.
   */
  normalize(raw: string): string | null {
    const trimmed = (raw ?? '').replace(/[\s()\-.]/g, '');
    if (!trimmed) return null;

    let candidate = trimmed;
    if (candidate.startsWith('00')) candidate = '+' + candidate.slice(2);

    if (!candidate.startsWith('+')) {
      const cc = (process.env.SMS_DEFAULT_COUNTRY_CODE ?? '').replace(/[^\d+]/g, '');
      if (!cc) return null;

      // A local number keeps its own minimum length. Without this a short
      // typo like "12345" becomes a well-formed but nonexistent E.164 string
      // once the country code is prefixed, and the failure only surfaces at
      // Twilio, after we have already stored the number.
      const local = candidate.replace(/^0+/, '');
      if (!/^\d{6,14}$/.test(local)) return null;

      candidate = (cc.startsWith('+') ? cc : '+' + cc) + local;
    }

    return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : null;
  }

  async send(to: string, body: string) {
    const provider = this.provider;
    if (!provider.configured) {
      if (process.env.SMS_STRICT === 'true' || process.env.NODE_ENV === 'production') {
        this.logger.error(
          `An SMS was requested but the "${provider.name}" SMS provider is not configured. For Twilio set ` +
          'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and one of TWILIO_MESSAGING_SERVICE_SID / TWILIO_SENDER_ID / TWILIO_PHONE_NUMBER.',
        );
        throw new SmsDeliveryError('Text messages are unavailable right now. Please try again later.');
      }
      const r = await this.log.send(to, body);
      return { sid: r.id, to, dev: true };
    }
    const r = await provider.send(to, body);
    return { sid: r.id, to, dev: r.dev };
  }

  /**
   * The one-time-code text, in one place.
   *
   *   Kidora: 482913 is your verification code. It expires in 5 minutes.
   *   Never share this code — Kidora will never ask for it.
   *
   *   @kidora.app #482913
   *
   * The brand leads so it is the first thing on the lock screen, and the code
   * comes before any other number so phones offer it for autofill. The last
   * line is the WebOTP / Android SMS Retriever format: it binds the code to
   * the web app's domain, letting the browser fill it in with one tap. It is
   * only added when that domain is a real https host, because a line naming
   * localhost would be meaningless to the recipient.
   */
  otpMessage(code: string) {
    const lines = [
      `Kidora: ${code} is your verification code. It expires in ${OTP_MINUTES} minutes.`,
      'Never share this code — Kidora will never ask for it.',
    ];
    const domain = SmsService.otpDomain();
    if (domain) lines.push('', `@${domain} #${code}`);
    return lines.join('\n');
  }

  sendOtp(to: string, code: string) {
    return this.send(to, this.otpMessage(code));
  }

  /** SMS_OTP_DOMAIN, or the host of an https WEB_URL; null otherwise. */
  static otpDomain(): string | null {
    const explicit = process.env.SMS_OTP_DOMAIN?.trim();
    if (explicit) return explicit;
    try {
      const url = new URL(process.env.WEB_URL ?? '');
      return url.protocol === 'https:' ? url.hostname : null;
    } catch {
      return null;
    }
  }
}
