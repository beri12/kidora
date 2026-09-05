import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() search?: string;
}

export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; }
export const skip = (p: PaginationDto) => (p.page - 1) * p.pageSize;
export const paginate = <T>(items: T[], total: number, p: PaginationDto): Paginated<T> => ({ items, total, page: p.page, pageSize: p.pageSize });
