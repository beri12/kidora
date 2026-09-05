import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Twilio SMS sender.
 *
 * Both of the naming conventions Twilio's own docs use are accepted, because
 * an existing .env may already carry either one:
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER  (console default)
 *   TWILIO_SID         / TWILIO_TOKEN      / TWILIO_FROM          (short form)
 *
 * TWILIO_MESSAGING_SERVICE_SID is used instead of a from-number when set.
 *
 * With no credentials the sender logs the message instead of throwing, so OTP
 * flows stay testable offline. Set SMS_STRICT=true to fail loudly instead.
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
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    };
  }

  /** True when Twilio can actually deliver a message. */
  get enabled() {
    const { sid, token, from, messagingServiceSid } = this.config;
    return Boolean(sid && token && (from || messagingServiceSid));
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
    const { sid, token, from, messagingServiceSid } = this.config;

    if (!this.enabled) {
      if (process.env.SMS_STRICT === 'true') {
        throw new ServiceUnavailableException('SMS is not configured on this server.');
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
      const msg = await this.client.messages.create(
        messagingServiceSid ? { to, body, messagingServiceSid } : { to, body, from },
      );
      return { sid: msg.sid, to, dev: false };
    } catch (e) {
      // Twilio's message carries the actionable detail (unverified number,
      // trial-account restriction, bad from-number); keep it in the logs but
      // don't leak account details to the caller.
      this.logger.error(`Twilio send to ${to} failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Could not send the SMS code. Try again shortly.');
    }
  }
}
