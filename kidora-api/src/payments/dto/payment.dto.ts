import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
// Stripe hosted checkout. PayPal uses create-paypal-order.dto.ts.
export class CheckoutDto { @ApiProperty({ enum: ['family','school'] }) @IsIn(['family','school']) plan!: 'family' | 'school'; }
