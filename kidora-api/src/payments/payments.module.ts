import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { PaymentsController } from './payments.controller';
import { PaymentSettlementService } from './payment-settlement.service';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  providers: [StripeService, PaypalService, PaymentSettlementService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
