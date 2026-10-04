import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** A PayPal order id, as returned by POST /payments/paypal/create-order. */
export class CapturePaypalOrderDto {
  @ApiProperty({ example: '5O190127TN364715T' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,64}$/, { message: 'We could not find that payment.' })
  orderId!: string;
}

/** The buyer closed the PayPal window. */
export class CancelPaypalOrderDto extends CapturePaypalOrderDto {}
