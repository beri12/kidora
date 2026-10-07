/**
 * Transport-level contracts.
 *
 * The Kidora NestJS API returns resources unwrapped (no `{ data }` envelope),
 * so `ApiResponse<T>` is simply `T`. Errors come from AllExceptionsFilter as
 * `{ statusCode, path, timestamp, error }`, where `error` is either a string
 * or Nest's `{ message, error, statusCode }` object (message may be a list
 * from the ValidationPipe).
 */
export type ApiResponse<T> = T;

/** Matches `Paginated<T>` in kidora-api/src/lms/common/dto/pagination.dto.ts. */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface BackendErrorBody {
  statusCode: number;
  path?: string;
  timestamp?: string;
  error?: string | { message?: string | string[]; error?: string; statusCode?: number };
}

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'offline'
  | 'unknown';

/** Count + unit + optional trend, used by every dashboard KPI on the backend. */
export interface Kpi {
  value: number;
  unit: 'count' | 'percent' | 'days' | 'coins' | string;
  caption?: string;
  trend?: { delta: number; label: string; series?: number[] };
}

export type DateRange = 'week' | 'month' | 'quarter' | 'year';
