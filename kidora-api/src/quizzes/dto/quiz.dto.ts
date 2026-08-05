import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
export class SubmitQuizDto { @ApiProperty({ type: [Number] }) @IsArray() answers: number[]; }
