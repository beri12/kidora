import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PricingService } from './pricing.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private pricing: PricingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Active plans and school tiers for the pricing page' })
  catalog() {
    return this.pricing.publicCatalog();
  }
}
