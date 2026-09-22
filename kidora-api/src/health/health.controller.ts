import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { FEATURES } from './features';

const STARTED_AT = new Date().toISOString();

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public() @Get()
  @ApiOperation({ summary: 'Liveness, plus which features this build has — check here when a route 404s.' })
  check() {
    return {
      status: 'ok',
      ts: new Date().toISOString(),
      startedAt: STARTED_AT,
      features: FEATURES,
    };
  }
}
