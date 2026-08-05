import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
