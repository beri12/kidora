import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlanKey } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async mine(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) sub = await this.prisma.subscription.create({ data: { userId, plan: 'free' } });
    return sub;
  }

  // Change plan (upgrade/downgrade). Payment activation happens via the
  // Stripe/PayPal webhooks in PaymentsModule; this is the internal sync point.
  async setPlan(userId: string, plan: PlanKey) {
    await this.mine(userId);
    return this.prisma.subscription.update({
      where: { userId },
      data: { plan, status: 'active', renewsAt: plan === 'free' ? null : new Date(Date.now() + 30 * 864e5) },
    });
  }

  async cancel(userId: string) {
    return this.prisma.subscription.update({ where: { userId }, data: { status: 'cancelled' } });
  }

  // Usage snapshot for the account screen.
  async usage(userId: string) {
    const [lessons, ai, games] = await Promise.all([
      this.prisma.progress.count({ where: { userId } }),
      this.prisma.aIConversation.count({ where: { userId } }),
      this.prisma.transaction.count({ where: { userId, description: { contains: 'game', mode: 'insensitive' } } }),
    ]);
    return { lessons, aiChats: ai, games };
  }
}
