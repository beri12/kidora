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
  ApiTags,
} from '@nestjs/swagger';


import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { SmsMfaService } from './services/sms-mfa.service';
import { PhoneAuthService } from './services/phone-auth.service';


import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  MfaVerifyDto,
  RequestOtpDto,
  VerifyOtpDto,
  SetPhoneDto,
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

 private phoneAuth:PhoneAuthService

){}






@Public()

@Post('register')

register(
 @Body() dto:RegisterDto
){

 return this.auth.register(dto);

}








@Public()

@Post('login')

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

@Post('otp/request')

requestOtp(
 @Body() dto:RequestOtpDto
){

 return this.phoneAuth.requestLoginCode(
  dto.phone
 );

}




/**
 * Passwordless SMS sign-in, step 2. Returns the same token pair as /auth/login.
 */

@Public()

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




/** Confirm the number attached above. */

@ApiBearerAuth()

@UseGuards(JwtAuthGuard)

@Post('phone/verify')

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