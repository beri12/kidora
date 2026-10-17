import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { RoleController, UsersRoleController } from './role.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';
import { OAuthService } from './services/oauth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { RegistrationService } from './services/registeration.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { PhoneVerificationService } from './services/phone-verification.service';

// Social sign-in is Google and Facebook only. Each strategy self-disables
// when its client id env var is absent, so the app boots with either or none.
const oauthStrategies = [GoogleStrategy, FacebookStrategy];

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, RoleController, OAuthController, UsersRoleController],
  providers: [
    AuthService,
    TokenService,
    MfaService,
    OAuthService,
    EmailVerificationService,
    PhoneVerificationService,
    RegistrationService,
    JwtStrategy,
    ...oauthStrategies,
  ],
  exports: [AuthService, TokenService, RegistrationService],
})
export class AuthModule {}
