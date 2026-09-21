import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PhoneAuthService } from './services/phone-auth.service';
import { AuthService } from './services/auth.service';
import { PhoneStartDto, PhoneVerifyDto, SelectRoleDto } from './dto/phone-auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/**
 * Phone-first sign-in: one number, one code, no password.
 *
 * POST /auth/phone/start   → texts a 6-digit code (Twilio)
 * POST /auth/phone/verify  → checks the code, signs in or creates the account
 * POST /auth/role          → records "How will you use Kidora?" afterwards
 *
 * Both OTP routes are throttled on top of the service's own per-number and
 * per-IP limits, because SMS costs real money per message.
 */
@ApiTags('auth-phone')
@Controller('auth')
export class PhoneAuthController {
  constructor(private phoneAuth: PhoneAuthService, private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('phone/start')
  @ApiOperation({ summary: 'Send a one-time code by SMS' })
  start(@Body() dto: PhoneStartDto, @Req() req: any) {
    return this.phoneAuth.start(dto, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Post('phone/verify')
  @ApiOperation({ summary: 'Verify the code and sign in (creates the account on first use)' })
  verify(@Body() dto: PhoneVerifyDto, @Req() req: any) {
    return this.phoneAuth.verify(dto, req.ip, req.headers['user-agent'] ?? '');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('role')
  @ApiOperation({ summary: 'Record the role a new account picked' })
  selectRole(@CurrentUser() user: AuthUser, @Body() dto: SelectRoleDto) {
    return this.auth.selectRole(user.id, dto);
  }
}
