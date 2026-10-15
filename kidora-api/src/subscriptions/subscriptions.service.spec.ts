import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService.setPlan', () => {
  const prisma = {
    subscription: {
      findUnique: jest.fn(async () => ({ userId: 'u1', plan: 'free' })),
      update: jest.fn(async ({ data }: any) => ({ userId: 'u1', ...data })),
    },
  };
  const svc = new SubscriptionsService(prisma as any);

  // Regression: this endpoint used to grant any plan to whoever asked.
  it.each(['family', 'school', 'district'])('refuses to grant the paid "%s" plan without payment', async (plan) => {
    await expect(svc.setPlan('u1', plan as any)).rejects.toThrow(BadRequestException);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it('allows moving to the free plan', async () => {
    await expect(svc.setPlan('u1', 'free')).resolves.toMatchObject({ plan: 'free' });
  });
});
