import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MfaService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // Generate a TOTP secret + QR code for the authenticator app.
  async setup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const issuer = this.config.get<string>('auth.mfaIssuer')!;
    const otpauth = authenticator.keyuri(email, issuer, secret);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const qr = await QRCode.toDataURL(otpauth);
    return { secret, qr };
  }

  // Confirm the first code, enable MFA, and hand back one-time backup codes.
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret || !authenticator.check(code, user.mfaSecret)) throw new BadRequestException('Invalid code');
    const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, backupCodes } });
    return { backupCodes };
  }

  verify(secret: string, code: string) { return authenticator.check(code, secret); }
}
