import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto'
import { JwtPayload } from './Jwt-payload.interface';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role ?? Role.PARENT,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0 },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token not recognized or expired');
    }

    // Rotate: delete the used token, issue a brand new pair.
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { userId, tokenHash } });
    return { success: true };
  }

  private async issueTokens(userId: string, email: string, role: Role) {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      expiresIn: ACCESS_EXPIRES_IN,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
    });

    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(refreshToken), expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role },
    };
  }

  // Refresh tokens are stored hashed (never plaintext) so a DB leak alone
  // doesn't let someone mint sessions.
  private hashToken(token: string): string {
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }
}