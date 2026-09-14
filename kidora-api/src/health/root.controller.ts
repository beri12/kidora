import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { FEATURES } from './features';

/**
 * An index at the API root.
 *
 * Every route lives *under* /api — /api/health, /api/auth/login, /api/uploads
 * — so the bare root had nothing mapped to it and answered "Cannot GET /api".
 * That is technically correct and thoroughly misleading: the first thing
 * anyone does with a freshly started API is open the URL it printed, and an
 * error-shaped 404 there reads as "the server is broken" when it is working
 * perfectly. This answers with where to go instead.
 */
@ApiTags('health')
@Controller()
export class RootController {
  @Public() @Get()
  @ApiExcludeEndpoint()
  index() {
    return {
      name: 'Kidora API',
      status: 'ok',
      message: 'The API is running. Every route lives under /api — this root has none of its own.',
      docs: '/api/docs',
      health: '/api/health',
      examples: {
        login: 'POST /api/auth/login',
        courses: 'GET /api/learning/browse',
        upload: 'POST /api/uploads',
      },
      features: FEATURES,
    };
  }
}
