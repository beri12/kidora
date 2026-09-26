import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { LiveGamesService } from './live-games.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GamesContentService } from './content/games-content.service';
import { LmsModule } from '../lms/lms.module';

@Module({
  imports: [LmsModule],
  providers: [GamesGateway, LiveGamesService, GamesService, GamesContentService],
  controllers: [GamesController],
})
export class GamesModule {}
