import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Invoices are derived from succeeded payments. In production you'd store
// generated PDF URLs (S3/R2); here we expose a stable download route.
@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async forUser(userId: string) {
    const payments = await this.prisma.payment.findMany({
      // Pilot activations are recorded as payments, but nothing was charged.
      where: { userId, status: 'succeeded', provider: { not: 'pilot' } },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p, i) => ({
      id: p.id,
      number: 'KID-' + new Date(p.createdAt).getFullYear() + '-' + String(payments.length - i).padStart(4, '0'),
      plan: p.plan,
      amount: (p.amountCents / 100).toFixed(2),
      currency: p.currency,
      provider: p.provider,
      pdfUrl: '/api/invoices/' + p.id + '/pdf',
      createdAt: p.createdAt,
    }));
  }
}
