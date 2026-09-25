import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SmsService } from '../../infrastructure/sms/sms.service';
import { OtpStore } from './otp.store';
import { exposeOtpForTests, newOtpCode } from './otp-code';

const OTP_TTL = 300; // 5 min
const MAX_ATTEMPTS = 5;

/**
 * SMS second factor for an already-authenticated user. Distinct from
 * PhoneAuthService, which uses SMS as the *first* factor.
 */
@Injectable()
export class SmsMfaService {
  constructor(private store: OtpStore, private sms: SmsService) {}

  /** Generate a 6-digit code, store it hashed, and text it to the user. */
  async challenge(userId: string, rawPhone: string) {
    const phone = this.sms.normalize(rawPhone);
    if (!phone) {
      throw new BadRequestException(
        'Enter a valid mobile number, including the country code (for example +251912345678).',
      );
    }

    const code = newOtpCode();
    await this.store.set(
      'mfa',
      userId,
      {
        codeHash: await bcrypt.hash(code, 10),
        attempts: 0,
        issuedAt: Date.now(),
        expiresAt: Date.now() + OTP_TTL * 1000,
      },
      OTP_TTL,
    );

    try {
      const result = await this.sms.sendOtp(phone, code);
      return {
        sent: true,
        expiresIn: OTP_TTL,
        // The code goes by SMS only; see exposeOtpForTests for the one exception.
        ...(result.dev && exposeOtpForTests() ? { devCode: code } : {}),
      };
    } catch (err) {
      // A code nobody received must not stay redeemable.
      await this.store.del('mfa', userId);
      throw err;
    }
  }

  async verify(userId: string, code: string) {
    const record = await this.store.get('mfa', userId);
    if (!record) throw new BadRequestException('Invalid or expired code');

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.store.del('mfa', userId);
      throw new BadRequestException('Too many incorrect attempts. Request a new code.');
    }

    if (!(await bcrypt.compare(code, record.codeHash))) {
      // Keep the original expiry so a wrong guess can't extend the code's life.
      const remainingMs = record.expiresAt - Date.now();
      await this.store.set(
        'mfa',
        userId,
        { ...record, attempts: record.attempts + 1 },
        Math.max(1, Math.ceil(remainingMs / 1000)),
      );
      throw new BadRequestException('Invalid or expired code');
    }

    await this.store.del('mfa', userId);
    return { verified: true };
  }
}
