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

  // `email` is nullable: an account created from a phone number has none, and
  // the JWT simply carries `email: null` for it.
  /**
   * A new access + refresh pair. The refresh token carries `rid`, the id of
   * its RefreshToken row, so redeeming it is one lookup (not a bcrypt pass
   * over every token the user ever had) and the row can be deleted on use.
   */
  async issue(user: { id: string; email?: string | null; role: Role }) {
    const jti = randomUUID();
    const rid = randomUUID();
    const payload = { sub: user.id, email: user.email ?? null, role: user.role, jti };
    const refreshTtl = this.config.get<number>('auth.refreshTtl')!;
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.get('auth.accessSecret'), expiresIn: this.config.get<number>('auth.accessTtl') });
    const refreshToken = await this.jwt.signAsync({ ...payload, rid }, { secret: this.config.get('auth.refreshSecret'), expiresIn: refreshTtl });
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({ data: { id: rid, userId: user.id, tokenHash, expiresAt: new Date(Date.now() + refreshTtl * 1000) } });
    return { accessToken, refreshToken };
  }

  /**
   * Redeems a refresh token exactly once (rotation). Returns the user id it
   * belonged to, or null when it is not redeemable.
   *
   * A well-signed token whose row is already gone has been used before. That
   * is either a bug in a client or a stolen token being replayed, and the
   * two cannot be told apart — so every session of that user is revoked and
   * they sign in again.
   */
  async consumeRefresh(token: string, payload: { sub: string; rid?: string }): Promise<string | null> {
    if (payload.rid) {
      const row = await this.prisma.refreshToken.findUnique({ where: { id: payload.rid } });
      if (!row || row.userId !== payload.sub) {
        await this.prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
        return null;
      }
      const { count } = await this.prisma.refreshToken.deleteMany({ where: { id: row.id } });
      // Two requests racing with the same token: only one delete wins.
      if (count !== 1 || row.expiresAt < new Date() || !(await bcrypt.compare(token, row.tokenHash))) return null;
      return row.userId;
    }

    // Tokens issued before rotation carry no `rid`: find the row the slow way,
    // once, and retire it so the next refresh uses the new format.
    const rows = await this.prisma.refreshToken.findMany({ where: { userId: payload.sub, expiresAt: { gt: new Date() } } });
    for (const row of rows) {
      if (await bcrypt.compare(token, row.tokenHash)) {
        await this.prisma.refreshToken.delete({ where: { id: row.id } });
        return row.userId;
      }
    }
    return null;
  }

  async verifyRefresh(token: string) {
    return this.jwt.verifyAsync(token, { secret: this.config.get('auth.refreshSecret') });
  }
}
