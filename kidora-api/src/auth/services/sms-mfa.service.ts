import { Injectable, BadRequestException } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { SmsService } from '../../infrastructure/sms/sms.service';

const OTP_TTL = 300; // 5 min

@Injectable()
export class SmsMfaService {
  constructor(private cache: CacheService, private sms: SmsService) {}

  // Generate a 6-digit code, store hashed in Redis, and text it to the user.
  async challenge(userId: string, phone: string) {
    const code = ('' + Math.floor(100000 + Math.random() * 900000));
    await this.cache.set('otp:' + userId, code, OTP_TTL);
    await this.sms.send(phone, 'Your Kidora code is ' + code);
    return { sent: true, expiresIn: OTP_TTL };
  }

  async verify(userId: string, code: string) {
    const stored = await this.cache.get<string>('otp:' + userId);
    if (!stored || stored !== code) throw new BadRequestException('Invalid or expired code');
    await this.cache.del('otp:' + userId);
    return { verified: true };
  }
}
