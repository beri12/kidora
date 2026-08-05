import { Module } from '@nestjs/common';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { EconomyModule } from '../economy/economy.module';

@Module({ imports: [EconomyModule], providers: [GamesGateway, GamesService], controllers: [GamesController] })
export class GamesModule {}
