import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PlanKey } from '@prisma/client';

/**
 * Only names the plan. Price, currency and duration are looked up on the
 * server; an `amount` sent by the browser is stripped by the ValidationPipe.
 */
export class CreatePaypalOrderDto {
  @ApiProperty({ enum: PlanKey, example: 'family' })
  @IsEnum(PlanKey, { message: 'This plan is currently unavailable.' })
  planId!: PlanKey;
}

/** Same contract for a $0 pilot/free activation. */
export class ActivatePlanDto extends CreatePaypalOrderDto {}
