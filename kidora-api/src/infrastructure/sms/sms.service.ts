import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * A send that Twilio refused, carrying its error code so callers can tell a
 * configuration problem from a bad number.
 *
 * The codes worth naming, because each has a different fix:
 *   21608  trial account — the recipient is not on the verified-numbers list
 *   21211  the "to" number is not a real number
 *   21408  the account has no permission to send to that country
 *   21606/21659  the "from" number is not one this account can send from
 */
export class SmsDeliveryError extends ServiceUnavailableException {
  constructor(message: string, readonly twilioCode?: number) {
    super(message);
  }
}

/** What to tell the operator — not the end user — about a refused send. */
const REMEDY: Record<number, string> = {
  21608:
    'This is a Twilio TRIAL account: it can only text numbers you have verified. ' +
    'Add the number at twilio.com/console/phone-numbers/verified, or upgrade the account. ' +
    'For local development, leave the Twilio variables unset instead and the code is logged here.',
  21211: 'Twilio rejected the destination number. Check the country code.',
  21408: 'This Twilio account is not permitted to send to that country. Enable the region under Messaging > Geo permissions.',
  21606: 'TWILIO_PHONE_NUMBER is not an SMS-capable number on this account.',
  21659: 'TWILIO_PHONE_NUMBER is not owned by this account.',
  21212: 'The sender is not valid. If TWILIO_SENDER_ID is set, that country may not accept alphanumeric senders — unset it to send from TWILIO_PHONE_NUMBER.',
  21614: 'The destination is not a mobile number, so it cannot receive SMS.',
};

/**
 * What to tell the person holding the phone. Only refusals that are about
 * *their* number are worth spelling out; everything else is our problem and
 * gets the generic line, with the detail kept in the server log.
 */
const USER_MESSAGE: Record<number, string> = {
  21211: "That doesn't look like a real phone number. Check the country code and try again.",
  21614: "That number can't receive text messages. Use a mobile number.",
  21408: "We can't send text messages to that country yet.",
  21610: 'That number has opted out of text messages from Kidora. Reply START to our last message to opt back in.',
};

/** How long a one-time code stays valid, in minutes — kept in the SMS copy. */
const OTP_MINUTES = 5;

/**
 * Twilio SMS sender.
 *
 * Both of the naming conventions Twilio's own docs use are accepted, because
 * an existing .env may already carry either one:
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER  (console default)
 *   TWILIO_SID         / TWILIO_TOKEN      / TWILIO_FROM          (short form)
 *
 * The sender, in order of preference:
 *   TWILIO_MESSAGING_SERVICE_SID  a Messaging Service (best deliverability)
 *   TWILIO_SENDER_ID              an alphanumeric sender such as "KIDORA", so
 *                                 the text arrives from the brand name rather
 *                                 than a number (not accepted in every country)
 *   TWILIO_PHONE_NUMBER           a Twilio number
 *
 * With no credentials outside production the message is written to the server
 * log instead, so the flow can be tried offline — the code never goes back to
 * the browser. In production a missing configuration is an error: accepting
 * the request and texting nobody would leave the user waiting for a code that
 * is never coming. SMS_STRICT=true makes development fail the same way.
 */
@Injectable()
export class SmsService {
  private logger = new Logger('SMS');
  private client: any;

  private get config() {
    return {
      sid: process.env.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_SID,
      token: process.env.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_TOKEN,
      from: process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM,
      senderId: process.env.TWILIO_SENDER_ID?.trim(),
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    };
  }

  /** True when Twilio can actually deliver a message. */
  get enabled() {
    const { sid, token, from, senderId, messagingServiceSid } = this.config;
    return Boolean(sid && token && (from || senderId || messagingServiceSid));
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
    const { sid, token, from, senderId, messagingServiceSid } = this.config;

    if (!this.enabled) {
      if (process.env.SMS_STRICT === 'true' || process.env.NODE_ENV === 'production') {
        this.logger.error(
          'An SMS was requested but Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ' +
          'and one of TWILIO_MESSAGING_SERVICE_SID / TWILIO_SENDER_ID / TWILIO_PHONE_NUMBER.',
        );
        throw new SmsDeliveryError('Text messages are unavailable right now. Please try again later.');
      }
      this.logger.log(`[DEV SMS] to ${to}: ${body}`);
      return { sid: 'dev', to, dev: true };
    }

    // Lazy require so the app still boots if the optional dep is missing.
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.client = require('twilio')(sid, token);
    }

    try {
      const sender = messagingServiceSid ? { messagingServiceSid } : { from: senderId || from };
      const msg = await this.client.messages.create({ to, body, ...sender });
      return { sid: msg.sid, to, dev: false };
    } catch (e) {
      // Twilio's message carries the actionable detail (unverified number,
      // trial-account restriction, bad from-number); keep it in the logs but
      // don't leak account details to the caller.
      const code = Number((e as { code?: number }).code) || undefined;
      this.logger.error(`Twilio send to ${to} failed${code ? ` (${code})` : ''}: ${(e as Error).message}`);
      if (code && REMEDY[code]) this.logger.error(REMEDY[code]);
      throw new SmsDeliveryError(
        (code && USER_MESSAGE[code]) || "We couldn't text your code right now. Please try again in a moment.",
        code,
      );
    }
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
