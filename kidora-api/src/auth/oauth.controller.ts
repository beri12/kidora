import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ProviderGuard } from './guards/optional-oauth.guard';
import { OAuthService, OAuthProfile } from './services/oauth.service';

const GoogleGuard = ProviderGuard('google');
const FacebookGuard = ProviderGuard('facebook');
const TiktokGuard = ProviderGuard('tiktok');
const GithubGuard = ProviderGuard('github');
const MicrosoftGuard = ProviderGuard('microsoft');
const AppleGuard = ProviderGuard('apple');

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
      session = await this.oauth.validateOAuthLogin(req.user as OAuthProfile);
    } catch {
      return res.redirect(`${web}/auth/callback#error=failed&provider=${encodeURIComponent(req.user?.provider ?? '')}`);
    }
    // Hand tokens to the SPA via URL fragment; the client stores them.
    // `needsRole` tells the callback page whether to run the "How will you use
    // Kidora?" step or go straight to the dashboard.
    const frag =
      `#accessToken=${session.accessToken}&refreshToken=${session.refreshToken}` +
      `&needsRole=${session.needsRole ? '1' : '0'}`;
    return res.redirect(`${web}/auth/callback${frag}`);
  }

  /**
   * Which social providers are actually configured on this deployment.
   * The web app asks first so it never shows a button that can only fail —
   * a provider with no client id returns 501 from its start route.
   */
  @Public()
  @Get('providers')
  providers() {
    const enabled = (name: string, key: string) => (process.env[key] ? [name] : []);
    return {
      providers: [
        ...enabled('google', 'GOOGLE_CLIENT_ID'),
        ...enabled('facebook', 'FACEBOOK_CLIENT_ID'),
        ...enabled('tiktok', 'TIKTOK_CLIENT_ID'),
        ...enabled('github', 'GITHUB_CLIENT_ID'),
        ...enabled('microsoft', 'MICROSOFT_CLIENT_ID'),
        ...enabled('apple', 'APPLE_CLIENT_ID'),
      ],
    };
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
