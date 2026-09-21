import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsLegacyController } from './uploads-legacy.controller';
import { UploadsService } from './uploads.service';

// StorageService comes from StorageModule, which is @Global.
//
// Two controllers, one service: /api/media/upload/* (what src/lib/api.ts
// declares) and /api/uploads/* (what the course wizard calls) are the same
// rules behind two prefixes.
@Module({
  controllers: [UploadsController, UploadsLegacyController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
