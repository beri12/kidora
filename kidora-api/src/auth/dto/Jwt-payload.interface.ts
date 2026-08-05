import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: Role;
}