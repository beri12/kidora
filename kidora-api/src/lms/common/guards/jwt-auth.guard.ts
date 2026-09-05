import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * PLACEHOLDER. Your repository already has a JWT guard/strategy.
 * Replace the export below with:  export { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
 * The only contract: request.user = { id, role, schoolId }.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
