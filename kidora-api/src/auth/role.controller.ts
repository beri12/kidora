import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './services/auth.service';
import { SelectRoleDto } from './dto/role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

/**
 * POST /auth/role — records "How will you use Kidora?" (and, for students,
 * the profile step) after email or social sign-up.
 */
@ApiTags('auth')
@Controller('auth')
export class RoleController {
  constructor(private auth: AuthService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('role')
  @ApiOperation({ summary: 'Record the role a new account picked' })
  selectRole(@CurrentUser() user: AuthUser, @Body() dto: SelectRoleDto) {
    return this.auth.selectRole(user.id, dto);
  }
}
/** `POST /users/role` — the same "How will you use Kidora?" answer under the users resource. */
@ApiTags('users')
@Controller('users')
export class UsersRoleController {
  constructor(private auth: AuthService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('role')
  @ApiOperation({ summary: 'Record the role a new account picked' })
  selectRole(@CurrentUser() user: AuthUser, @Body() dto: SelectRoleDto) {
    return this.auth.selectRole(user.id, dto);
  }
}
