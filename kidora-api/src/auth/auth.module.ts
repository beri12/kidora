import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';
import { OAuthService } from './services/oauth.service';
import { SmsMfaService } from './services/sms-mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

// OAuth strategies self-disable when their client id env var is absent,
// so the app still boots with only Google (or none) configured.
const oauthStrategies = [GoogleStrategy, GithubStrategy, MicrosoftStrategy, AppleStrategy];

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, TokenService, MfaService, OAuthService, SmsMfaService, JwtStrategy, ...oauthStrategies],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
