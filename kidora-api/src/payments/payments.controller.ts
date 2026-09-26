import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { ChapaService } from './chapa.service';
import { CheckoutDto, CaptureDto, ChapaVerifyParams } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private stripe: StripeService, private paypal: PaypalService, private chapa: ChapaService) {}

  /** Which ways to pay are configured, so the web app only offers those. */
  @Public() @Get('providers')
  providers() {
    return {
      chapa: this.chapa.enabled,
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    };
  }

  // --- Chapa ---------------------------------------------------------------

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('chapa/checkout')
  chapaCheckout(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) { return this.chapa.createCheckout(u.id, dto.plan); }

  /** The buyer's browser, back from Chapa, asks whether the payment went through. */
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('chapa/verify/:txRef')
  chapaVerify(@CurrentUser() u: AuthUser, @Param() p: ChapaVerifyParams) { return this.chapa.confirm(p.txRef, u.id); }

  /** Chapa's server-to-server callback (GET ?trx_ref=…). Re-verified with Chapa before anything is granted. */
  @Public() @Get('chapa/callback')
  async chapaCallback(@Query('trx_ref') trxRef?: string, @Query('tx_ref') txRef?: string) {
    const ref = trxRef || txRef;
    if (!ref) throw new BadRequestException('Missing reference');
    const r = await this.chapa.confirm(ref);
    return { received: true, status: r.status };
  }

  /** Chapa webhook. Signature checked when CHAPA_WEBHOOK_SECRET is set; the payment is re-verified either way. */
  @Public() @Post('chapa/webhook')
  async chapaWebhook(
    @Req() req: any,
    @Body() body: { tx_ref?: string; trx_ref?: string },
    @Headers('x-chapa-signature') sig1?: string,
    @Headers('chapa-signature') sig2?: string,
  ) {
    if (!this.chapa.verifyWebhookSignature(req.rawBody, sig1 || sig2)) throw new BadRequestException('Bad signature');
    const ref = body?.tx_ref || body?.trx_ref;
    if (!ref) return { received: true };
    const r = await this.chapa.confirm(ref);
    return { received: true, status: r.status };
  }

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
