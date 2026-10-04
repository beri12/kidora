import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

/** Plans checkout can sell; the price always comes from the pricing table. */
export const CHECKOUT_PLANS = ['student', 'family', 'school', 'district'] as const;
export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];

export class CheckoutDto {
  @ApiProperty({ enum: CHECKOUT_PLANS })
  @IsIn(CHECKOUT_PLANS)
  plan!: CheckoutPlan;
}

/** A PayPal order id, as returned by create-order. */
export class CaptureDto {
  @ApiProperty({ example: '5O190127TN364715T' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,64}$/, { message: 'We could not find that payment.' })
  orderId!: string;
}

export class ChapaVerifyParams {
  @ApiProperty({ example: 'kidora-3f0c…' })
  @Matches(/^kidora-[0-9a-f-]{36}$/)
  txRef!: string;
}
