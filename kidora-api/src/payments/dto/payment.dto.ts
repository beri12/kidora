import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
export class CheckoutDto { @ApiProperty({ enum: ['family','school'] }) @IsIn(['family','school']) plan!: 'family' | 'school'; }
export class CaptureDto { @ApiProperty() @IsString() orderId!: string; }
