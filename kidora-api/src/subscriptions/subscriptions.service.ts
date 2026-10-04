import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlanKey } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService, private payments: PaymentsService) {}

  async mine(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) sub = await this.prisma.subscription.create({ data: { userId, plan: 'free' } });
    return sub;
  }

  // Change plan. This used to activate any plan it was given, so a signed-in
  // user could POST {plan:'school'} and skip payment. It now goes through the
  // same rules as the pricing page: $0 plans (pilot / free tier) activate,
  // paid plans are refused with "requires payment" and must use PayPal.
  async setPlan(userId: string, plan: PlanKey) {
    await this.payments.activatePlan(userId, plan);
    return this.mine(userId);
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
