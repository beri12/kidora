import { IsString, IsOptional } from 'class-validator';

export class CreateDraftDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // add whatever fields your curriculum page actually sends
}