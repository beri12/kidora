import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ProviderGuard } from './guards/optional-oauth.guard';
import { OAuthService, OAuthProfile } from './services/oauth.service';

const GoogleGuard = ProviderGuard('google');
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
    const session = await this.oauth.validateOAuthLogin(req.user as OAuthProfile);
    const web = this.config.get<string>('app.webUrl');
    // Hand tokens to the SPA via URL fragment; the client stores them.
    const frag = `#accessToken=${session.accessToken}&refreshToken=${session.refreshToken}`;
    return res.redirect(`${web}/auth/callback${frag}`);
  }

  @Public() @UseGuards(GoogleGuard) @Get('google') google() { /* redirects */ }
  @Public() @UseGuards(GoogleGuard) @Get('google/callback') googleCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(GithubGuard) @Get('github') github() {}
  @Public() @UseGuards(GithubGuard) @Get('github/callback') githubCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(MicrosoftGuard) @Get('microsoft') microsoft() {}
  @Public() @UseGuards(MicrosoftGuard) @Get('microsoft/callback') microsoftCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }

  @Public() @UseGuards(AppleGuard) @Get('apple') apple() {}
  @Public() @UseGuards(AppleGuard) @Get('apple/callback') appleCb(@Req() req: any, @Res() res: any) { return this.finish(req, res); }
}
