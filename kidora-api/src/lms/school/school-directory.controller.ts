import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * "Search your school" on the sign-up profile step. Signed-in accounts only,
 * names and places only — never join codes, members or ids of anything else.
 */
@ApiTags('schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schools')
export class SchoolDirectoryController {
  constructor(private prisma: PrismaService) {}

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Find a school by name (at least 2 characters).' })
  async search(@Query('q') q = '') {
    const term = String(q).trim().slice(0, 80);
    if (term.length < 2) return [];
    return this.prisma.school.findMany({
      where: { active: true, name: { contains: term, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, country: true, address: true },
    });
  }
}
