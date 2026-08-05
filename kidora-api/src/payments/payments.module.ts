import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { PaymentsController } from './payments.controller';

@Module({ providers: [StripeService, PaypalService], controllers: [PaymentsController] })
export class PaymentsModule {}
