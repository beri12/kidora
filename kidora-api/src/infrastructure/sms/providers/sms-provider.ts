import { Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Anything that can deliver a text message. Kidora talks to SMS through this
 * interface only, so a regional provider (Africa's Talking, Ethio Telecom's
 * gateway, …) is one new class plus one line in resolveSmsProvider().
 */
export interface SmsProvider {
  /** Shown in logs and in the boot banner. */
  readonly name: string;
  /** True when the provider has what it needs to deliver for real. */
  readonly configured: boolean;
  /** Delivers `body` to `to` (E.164). Throws SmsDeliveryError on refusal. */
  send(to: string, body: string): Promise<{ id: string; dev: boolean }>;
}

/**
 * A send the SMS provider refused, carrying its error code so callers can tell a
 * configuration problem from a bad number.
 *
 * The codes worth naming, because each has a different fix:
 *   21608  trial account — the recipient is not on the verified-numbers list
 *   21211  the "to" number is not a real number
 *   21408  the account has no permission to send to that country
 *   21606/21659  the "from" number is not one this account can send from
 */
export class SmsDeliveryError extends ServiceUnavailableException {
  constructor(message: string, readonly providerCode?: number) {
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

/** Twilio Programmable Messaging. */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  private logger = new Logger('SMS');
  private client: { messages: { create(o: Record<string, string>): Promise<{ sid: string }> } } | null = null;

  /**
   * Both of Twilio's own naming conventions are accepted:
   *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER  (console default)
   *   TWILIO_SID         / TWILIO_TOKEN      / TWILIO_FROM          (short form)
   *
   * The sender, in order of preference:
   *   TWILIO_MESSAGING_SERVICE_SID  a Messaging Service (best deliverability)
   *   TWILIO_SENDER_ID              an alphanumeric sender such as "KIDORA"
   *                                 (not accepted in every country)
   *   TWILIO_PHONE_NUMBER           a Twilio number
   */
  private get config() {
    return {
      sid: process.env.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_SID,
      token: process.env.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_TOKEN,
      from: process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM,
      senderId: process.env.TWILIO_SENDER_ID?.trim(),
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    };
  }

  get configured() {
    const { sid, token, from, senderId, messagingServiceSid } = this.config;
    return Boolean(sid && token && (from || senderId || messagingServiceSid));
  }

  async send(to: string, body: string) {
    const { sid, token, from, senderId, messagingServiceSid } = this.config;
    // Lazy require so the app still boots if the optional dependency is missing.
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.client = require('twilio')(sid, token);
    }
    try {
      const sender: Record<string, string> = messagingServiceSid
        ? { messagingServiceSid }
        : { from: (senderId || from) as string };
      const msg = await this.client!.messages.create({ to, body, ...sender });
      return { id: msg.sid, dev: false };
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
}

/**
 * Development only: writes the message to the server log. Never used in
 * production — SmsService refuses to send instead.
 */
export class LogSmsProvider implements SmsProvider {
  readonly name = 'log';
  readonly configured = false;
  private logger = new Logger('SMS');

  async send(to: string, body: string) {
    this.logger.log(`[DEV SMS] to ${to}: ${body}`);
    return { id: 'dev', dev: true };
  }
}

/**
 * SMS_PROVIDER picks the provider: "twilio" (the default) or "log". Anything
 * else is refused at the first send rather than silently texting nobody.
 */
export function resolveSmsProvider(twilio: TwilioSmsProvider, log: LogSmsProvider): SmsProvider {
  const wanted = (process.env.SMS_PROVIDER || 'twilio').trim().toLowerCase();
  if (wanted === 'log') return log;
  if (wanted === 'twilio') return twilio;
  throw new SmsDeliveryError(`Unknown SMS_PROVIDER "${wanted}". Use "twilio" or "log".`);
}
