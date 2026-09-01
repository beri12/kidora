// ---------------------------------------------------------------------------
// CONFLICT (documented in KIDORA_UPDATE_PLAN.md, section O).
//
// This directory holds an older, UNWIRED copy of the auth stack. The module the
// application actually loads is src/auth/auth.module.ts, whose guards and
// decorators live in src/common/. Nothing imports this file.
//
// It is kept rather than deleted so the removal can be reviewed on its own;
// do not add new imports from src/auth/dto/* — use src/common/* instead.
// ---------------------------------------------------------------------------
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './Jwt.strategy';
import { RolesGuard } from './Roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets are passed per-call in AuthService, not globally here
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService],
})
export class AuthModule {}