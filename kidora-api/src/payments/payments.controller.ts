import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { CheckoutDto, CaptureDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private stripe: StripeService, private paypal: PaypalService) {}

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('stripe/checkout')
  stripeCheckout(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) { return this.stripe.createCheckout(u.id, dto.plan); }

  // Stripe posts raw JSON here; signature verified in the service.
  @Public() @Post('stripe/webhook')
  stripeWebhook(@Req() req: any, @Headers('stripe-signature') sig: string) { return this.stripe.handleWebhook(req.rawBody, sig); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('paypal/order')
  paypalOrder(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) { return this.paypal.createOrder(u.id, dto.plan); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('paypal/capture')
  paypalCapture(@CurrentUser() u: AuthUser, @Body() dto: CaptureDto) { return this.paypal.capture(u.id, dto.orderId); }
}
