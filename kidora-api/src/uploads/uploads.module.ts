import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

// StorageService comes from StorageModule, which is @Global(), so it does
// not need to be imported here.
@Module({ controllers: [UploadsController] })
export class UploadsModule {}
