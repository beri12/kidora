import { Body, Controller, Get, Headers, HttpCode, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto/payment.dto';
import { ActivatePlanDto, CreatePaypalOrderDto } from './dto/create-paypal-order.dto';
import { CancelPaypalOrderDto, CapturePaypalOrderDto } from './dto/capture-paypal-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private stripe: StripeService, private payments: PaymentsService) {}

  // Prices and checkout mode per plan, plus the public PayPal client id.
  // Public so the pricing page renders before sign-in.
  @Public() @Get('plans')
  plans() { return this.payments.catalog(); }

  // $0 plans (pilot or free tier). Never calls PayPal.
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('activate-plan') @HttpCode(200)
  activatePlan(@CurrentUser() u: AuthUser, @Body() dto: ActivatePlanDto) { return this.payments.activatePlan(u.id, dto.planId); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('paypal/create-order')
  paypalCreateOrder(@CurrentUser() u: AuthUser, @Body() dto: CreatePaypalOrderDto) { return this.payments.createPaypalOrder(u.id, dto.planId); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('paypal/capture-order') @HttpCode(200)
  paypalCaptureOrder(@CurrentUser() u: AuthUser, @Body() dto: CapturePaypalOrderDto) { return this.payments.capturePaypalOrder(u.id, dto.orderId); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('paypal/cancel-order') @HttpCode(200)
  paypalCancelOrder(@CurrentUser() u: AuthUser, @Body() dto: CancelPaypalOrderDto) { return this.payments.cancelPaypalOrder(u.id, dto.orderId); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('stripe/checkout')
  stripeCheckout(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) { return this.stripe.createCheckout(u.id, dto.plan); }

  // Stripe posts raw JSON here; signature verified in the service.
  @Public() @Post('stripe/webhook')
  stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) { return this.stripe.handleWebhook(req.rawBody ?? Buffer.alloc(0), sig); }
}
