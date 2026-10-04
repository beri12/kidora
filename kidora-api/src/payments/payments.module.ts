import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { PlansService } from './plans.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  providers: [PlansService, PaypalService, PaymentsService, StripeService],
  controllers: [PaymentsController],
  exports: [PlansService, PaymentsService],
})
export class PaymentsModule {}
