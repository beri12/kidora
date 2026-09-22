import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AppRole } from '../common/enums/role.enum';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService, private users: UsersService) {}

  /** The signed-in user's own profile, including merged preferences. */
  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.users.me(u.id);
  }

  /** Only self-editable fields; the DTO omits role, school and grade. */
  @Patch('me')
  updateMe(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(u.id, dto);
  }

  @Get('me/settings')
  mySettings(@CurrentUser() u: AuthUser) {
    return this.users.settings(u.id);
  }

  @Patch('me/settings')
  updateMySettings(@CurrentUser() u: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(u.id, dto);
  }

  @UseGuards(RolesGuard) @Roles(AppRole.ADMIN) @Get()
  all() { return this.prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }); }
}
