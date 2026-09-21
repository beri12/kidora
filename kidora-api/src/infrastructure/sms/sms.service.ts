import { Injectable, Logger } from '@nestjs/common';

/**
 * Twilio SMS sender.
 *
 * Configure with either:
 *   TWILIO_SID + TWILIO_TOKEN + TWILIO_FROM                 (a purchased number)
 *   TWILIO_SID + TWILIO_TOKEN + TWILIO_MESSAGING_SERVICE_SID (a Messaging Service,
 *     which is what you want for international OTP traffic — Twilio then picks
 *     the best sender ID per destination country)
 *
 * With neither set the service falls back to logging, so the phone + OTP flow
 * stays testable offline. `enabled` tells callers which mode we are in; the
 * auth layer uses it to decide whether it may echo the code back in dev.
 */
@Injectable()
export class SmsService {
  private logger = new Logger('SMS');
  private client: any;

  get enabled(): boolean {
    return Boolean(
      process.env.TWILIO_SID &&
        process.env.TWILIO_TOKEN &&
        (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID),
    );
  }

  // Lazily built so the Twilio SDK is only touched when it is configured.
  private getClient() {
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    }
    return this.client;
  }

  async send(to: string, body: string) {
    if (!this.enabled) {
      this.logger.log(`[DEV SMS] to ${to}: ${body}`);
      return { sid: 'dev', dev: true };
    }

    const payload: Record<string, string> = { to, body };
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      payload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      payload.from = process.env.TWILIO_FROM!;
    }

    try {
      const msg = await this.getClient().messages.create(payload);
      return { sid: msg.sid, dev: false };
    } catch (e: any) {
      // Twilio error codes are worth keeping: 21211 = invalid "to" number,
      // 21408 = the account has no permission to send to that country.
      this.logger.error(`Twilio send failed (${e?.code ?? 'no code'}): ${e?.message ?? e}`);
      throw e;
    }
  }

  /** Convenience wrapper so the OTP copy lives in one place. */
  sendOtp(to: string, code: string) {
    return this.send(to, `${code} is your Kidora verification code. It expires in 5 minutes.`);
  }
}
