import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

// StorageService comes from StorageModule, which is @Global, so there is
// nothing to import here — the controller is the whole module.
@Module({ controllers: [UploadsController] })
export class UploadsModule {}
