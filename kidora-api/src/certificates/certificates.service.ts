import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Issue once per course per user.
  async issue(userId: string, courseName: string) {
    const existing = await this.prisma.certificate.findFirst({ where: { userId, courseName } });
    if (existing) return existing;
    const cert = await this.prisma.certificate.create({ data: { userId, courseName } });
    await this.notifications.create(userId, '🎓 Certificate earned!', 'You completed "' + courseName + '". Download your certificate.');
    return cert;
  }

  forUser(userId: string) { return this.prisma.certificate.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' } }); }
}
