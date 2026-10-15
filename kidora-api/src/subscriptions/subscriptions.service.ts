import { BadRequestException, Injectable } from '@nestjs/common';
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

  /**
   * Moving to the free plan is the only change a user can make directly.
   *
   * This used to accept any plan, so `POST /subscriptions {"plan":"school"}`
   * gave anyone a paid plan without paying. Paid plans are only ever granted
   * by PaymentsModule, after the provider's webhook has been verified.
   */
  async setPlan(userId: string, plan: PlanKey) {
    if (plan !== 'free') {
      throw new BadRequestException('Paid plans are activated by completing checkout, not by this endpoint.');
    }
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
