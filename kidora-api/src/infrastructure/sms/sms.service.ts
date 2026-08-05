import { Injectable, Logger } from '@nestjs/common';

// Twilio-style SMS sender. Set TWILIO_SID/TWILIO_TOKEN/TWILIO_FROM to enable;
// falls back to console logging in dev so OTP flows are testable offline.
@Injectable()
export class SmsService {
  private logger = new Logger('SMS');
  async send(to: string, body: string) {
    const sid = process.env.TWILIO_SID, token = process.env.TWILIO_TOKEN, from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) { this.logger.log('[DEV SMS] to ' + to + ': ' + body); return { sid: 'dev' }; }
    // Lazy import so the dep is optional. npm i twilio to enable.
    const twilio = require('twilio')(sid, token);
    return twilio.messages.create({ to, from, body });
  }
}
