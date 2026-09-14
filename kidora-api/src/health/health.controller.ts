import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * Which features this running build actually carries.
 *
 * A browser hitting a route the running API does not have gets Express's bare
 * "Cannot POST /api/uploads", which says nothing about why — and the usual
 * cause is an API still serving an older compiled bundle after a pull. Listing
 * the features here makes that one request away from obvious: if the response
 * has no `features`, or the feature you need is missing from it, the API is
 * behind the code you are looking at.
 *
 * Add a name here in the same commit that adds the endpoints the frontend
 * starts depending on.
 */
const FEATURES = [
  'auth.sms-otp',
  'lms.authoring',
  'lms.learning',
  'lms.studio',
  'uploads.file',
  'uploads.video-presign',
  'uploads.video-processing',
  'learning.content-progress',
] as const;

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
