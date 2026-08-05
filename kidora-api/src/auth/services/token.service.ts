import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService) {}

  async issue(user: { id: string; email: string; role: Role }) {
    const jti = randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role, jti };
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.get('auth.accessSecret'), expiresIn: this.config.get<number>('auth.accessTtl') });
    const refreshToken = await this.jwt.signAsync(payload, { secret: this.config.get('auth.refreshSecret'), expiresIn: this.config.get<number>('auth.refreshTtl') });
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + this.config.get<number>('auth.refreshTtl')! * 1000) } });
    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string) {
    return this.jwt.verifyAsync(token, { secret: this.config.get('auth.refreshSecret') });
  }
}
