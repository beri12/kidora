import { Module } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
@Module({ providers: [AvatarService], controllers: [AvatarController], exports: [AvatarService] })
export class AvatarModule {}
