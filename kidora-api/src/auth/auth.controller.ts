import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';


import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { SmsMfaService } from './services/sms-mfa.service';
import { PhoneAuthService } from './services/phone-auth.service';
import { EmailVerificationService } from './services/email-verification.service';


import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  MfaVerifyDto,
  RequestOtpDto,
  VerifyOtpDto,
  SetPhoneDto,
  EmailVerifyDto,
  EmailResendDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';


import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';


import { Public } from '../common/decorators/public.decorator';



@ApiTags('auth')
@Controller('auth')
export class AuthController {


constructor(

 private auth:AuthService,

 private mfa:MfaService,

 private smsMfa:SmsMfaService,

 private phoneAuth:PhoneAuthService,

 private emailVerification:EmailVerificationService

){}






/**
 * Creates the account and emails a 6-digit code. Returns
 * `{ needsEmailVerification: true, … }` — no tokens until the code is back.
 */

// No tighter per-IP limit than the app-wide one: a whole class signing up
// from one school network shares an address. Each email address is capped at
// 5 codes an hour by EmailVerificationService instead.

@Public()

@Post(['register', 'email/register'])

@ApiOperation({ summary: 'Create an email + password account and email a verification code' })

register(
 @Body() dto:RegisterDto
){

 return this.auth.register(dto);

}








/** Password sign-in. `email/login` is the same handler under the name the web app uses. */

@Public()

@Post(['login', 'email/login'])

login(
 @Body() dto:LoginDto,
 @Req() req:any
){

 return this.auth.login(

  dto,

  req.ip,

  req.headers['user-agent'] ?? ''

 );

}








@Public()

@Post('refresh')

refresh(
 @Body() dto:RefreshDto
){

 return this.auth.refresh(
  dto.refreshToken
 );

}





/**
 * Passwordless SMS sign-in, step 1.
 *
 * Always answers `{ sent: true }`, even for a number with no account, so the
 * endpoint cannot be used to find out who is registered.
 */

@Public()

@Throttle({ default: { limit: 6, ttl: 60_000 } })

@Post('otp/request')

requestOtp(
 @Body() dto:RequestOtpDto,
 @Req() req:any
){

 return this.phoneAuth.requestLoginCode(
  dto.phone,
  req.ip
 );

}




/**
 * Passwordless SMS sign-in, step 2. Returns the same token pair as /auth/login.
 */

@Public()

@Throttle({ default: { limit: 12, ttl: 60_000 } })

@Post('otp/verify')

verifyOtp(
 @Body() dto:VerifyOtpDto,
 @Req() req:any
){

 return this.phoneAuth.verifyLoginCode(

  dto.phone,

  dto.code,

  req.ip,

  req.headers['user-agent'] ?? ''

 );

}




/** Confirms the email address with the code it was sent, and signs in. */

@Public()

// Guessing is stopped per code (five wrong tries and it is gone), so this
// keeps the app-wide per-IP limit rather than blocking a classroom on one network.

@Post('email/verify')

@ApiOperation({ summary: 'Verify the emailed code and sign in' })

verifyEmail(
 @Body() dto:EmailVerifyDto,
 @Req() req:any
){

 return this.emailVerification.verify(

  dto.email,

  dto.code,

  req.ip,

  req.headers['user-agent'] ?? ''

 );

}




/**
 * Emails a new code. Answers the same way for any address, so it cannot be
 * used to find out who has an account.
 */

@Public()

@Throttle({ default: { limit: 10, ttl: 60_000 } })

@Post('email/resend')

@ApiOperation({ summary: 'Email a new verification code' })

resendEmail(
 @Body() dto:EmailResendDto
){

 return this.emailVerification.resend(dto.email);

}




/**
 * Forgot password. Always answers `{ sent: true }`: whether the address has
 * an account is never revealed.
 */

@Public()

@Throttle({ default: { limit: 5, ttl: 60_000 } })

@Post('password/forgot')

@ApiOperation({ summary: 'Email a password reset code' })

forgotPassword(
 @Body() dto:ForgotPasswordDto
){

 return this.emailVerification.forgotPassword(dto.email);

}




/** Sets the new password with the emailed code, ends every other session, signs in. */

@Public()

@Post('password/reset')

@ApiOperation({ summary: 'Reset the password with the emailed code' })

resetPassword(
 @Body() dto:ResetPasswordDto,
 @Req() req:any
){

 return this.emailVerification.resetPassword(

  dto.email,

  dto.code,

  dto.password,

  req.ip,

  req.headers['user-agent'] ?? ''

 );

}




/** Attach a mobile number to the signed-in account and text a code to it. */

@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('phone/request')

requestPhoneVerification(
 @CurrentUser() user:AuthUser,
 @Body() dto:SetPhoneDto
){

 return this.phoneAuth.requestVerifyCode(
  user.id,
  dto.phone
 );

}




/**
 * Confirm the number attached above.
 *
 * `phone/confirm`, not `phone/verify`: the latter is the PUBLIC sign-in route
 * on PhoneAuthController, and two @Controller('auth') classes share one path
 * space. Whichever registers first wins, so the guarded route here shadowed
 * the sign-in one and every phone login answered 401.
 */

@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('phone/confirm')

confirmPhone(
 @CurrentUser() user:AuthUser,
 @Body() dto:VerifyOtpDto
){

 return this.phoneAuth.confirmPhone(
  user.id,
  dto.phone,
  dto.code
 );

}









@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('logout')

logout(
 @CurrentUser() user:AuthUser & {jti?:string}
){

 return this.auth.logout(
  user.id,
  user.jti
 );

}








@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Get('me')

me(
 @CurrentUser() user:AuthUser
){

 return this.auth.me(user.id);

}






@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('mfa/setup')

mfaSetup(
 @CurrentUser() user:AuthUser
){

 return this.mfa.setup(
  user.id,
  user.email
 );

}






@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('mfa/enable')

mfaEnable(
 @CurrentUser() user:AuthUser,
 @Body() dto:MfaVerifyDto
){

 return this.mfa.enable(
  user.id,
  dto.code
 );

}








@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('mfa/sms/send')

smsSend(
 @CurrentUser() user:AuthUser,
 @Body() body:{phone:string}
){

 return this.smsMfa.challenge(
  user.id,
  body.phone
 );

}








@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('mfa/sms/verify')

smsVerify(
 @CurrentUser() user:AuthUser,
 @Body() dto:MfaVerifyDto
){

 return this.smsMfa.verify(
  user.id,
  dto.code
 );

}


}