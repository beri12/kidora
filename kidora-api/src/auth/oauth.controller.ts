import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, Length } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ProviderGuard } from './guards/optional-oauth.guard';
import { oauthCredentials } from '../config/oauth-callback';
import { OAuthService, OAuthProfile } from './services/oauth.service';

const GoogleGuard = ProviderGuard('google');
const FacebookGuard = ProviderGuard('facebook');
const TiktokGuard = ProviderGuard('tiktok');
const GithubGuard = ProviderGuard('github');
const MicrosoftGuard = ProviderGuard('microsoft');
const AppleGuard = ProviderGuard('apple');

class OAuthExchangeDto {
  @IsString()
  @Length(16, 64)
  code!: string;
}

// Social login. Each provider has a start route (redirects to the provider)
// and a callback route (validates, issues our JWTs, redirects back to the web app).
@ApiTags('auth-oauth')
@Controller('auth')
export class OAuthController {
  constructor(private oauth: OAuthService, private config: ConfigService) {}

  private async finish(req: any, res: any) {
    const web = this.config.get<string>('app.webUrl');

    // ProviderGuard turns a refused or cancelled round trip into this marker.
    if (req.user?.oauthError) {
      const reason = req.user.oauthError === 'cancelled' ? 'cancelled' : 'failed';
      return res.redirect(`${web}/auth/callback#error=${reason}&provider=${encodeURIComponent(req.user.provider)}`);
    }

    let session;
    try {
      session = await this.oauth.createExchangeCode(req.user as OAuthProfile);
    } catch {
      return res.redirect(`${web}/auth/callback#error=failed&provider=${encodeURIComponent(req.user?.provider ?? '')}`);
    }
    // No tokens in the URL: the web app trades this one-time, 60-second code
    // for them at POST /auth/oauth/exchange. `needsRole` only picks the next
    // screen; the exchange response is what the client trusts.
    return res.redirect(`${web}/auth/callback#code=${session.code}&needsRole=${session.needsRole ? '1' : '0'}`);
  }

  /** Trades the one-time code from the provider redirect for a token pair. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('oauth/exchange')
  exchange(@Body() body: OAuthExchangeDto) {
    return this.oauth.redeemExchangeCode(body.code);
  }

  /**
   * Which social providers are actually configured on this deployment.
   * The web app asks first so it never shows a button that can only fail —
   * a provider with no client id returns 501 from its start route.
   */
  @Public()
  @Get('providers')
  providers() {
    const all = ['google', 'tiktok', 'facebook', 'github', 'microsoft', 'apple'];
    return { providers: all.filter((p) => Boolean(oauthCredentials(p).id)) };
  }

  @Public() @UseGuards(GoogleGuard) @Get('google') google() { /* redirects */ }
  @Public() @UseGuards(GoogleGuard) @Get('google/callback') googleCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(FacebookGuard) @Get('facebook') facebook() {}
  @Public() @UseGuards(FacebookGuard) @Get('facebook/callback') facebookCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(TiktokGuard) @Get('tiktok') tiktok() {}
  @Public() @UseGuards(TiktokGuard) @Get('tiktok/callback') tiktokCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(GithubGuard) @Get('github') github() {}
  @Public() @UseGuards(GithubGuard) @Get('github/callback') githubCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(MicrosoftGuard) @Get('microsoft') microsoft() {}
  @Public() @UseGuards(MicrosoftGuard) @Get('microsoft/callback') microsoftCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(AppleGuard) @Get('apple') apple() {}
  @Public() @UseGuards(AppleGuard) @Get('apple/callback') appleCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }
}
