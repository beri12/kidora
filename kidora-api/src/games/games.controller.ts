import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EconomyService } from '../economy/economy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

// Static catalog of playable games (front-end renders these as cards).
const GAMES = [
  { id: 'math-race', title: 'Math Race', subject: 'Math', difficulty: 2, rewardCoins: 50 },
  { id: 'word-builder', title: 'Word Builder', subject: 'English', difficulty: 1, rewardCoins: 40 },
  { id: 'science-lab', title: 'Science Lab', subject: 'Science', difficulty: 3, rewardCoins: 60 },
  { id: 'code-maze', title: 'Code Maze', subject: 'Coding', difficulty: 3, rewardCoins: 70 },
  { id: 'balloon-pop', title: 'Balloon Pop', subject: 'Math', difficulty: 1, rewardCoins: 30 },
];

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private economy: EconomyService) {}

  @Public() @Get() list() { return GAMES; }

  // Submit a game result — credits coins + XP based on score.
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post(':id/result')
  async result(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: { score: number; won: boolean }) {
    const game = GAMES.find((g) => g.id === id);
    const coins = body.won ? (game?.rewardCoins ?? 20) : Math.floor((game?.rewardCoins ?? 20) / 3);
    const xp = Math.max(10, Math.round((body.score ?? 0) / 10));
    const wallet = await this.economy.earn(u.id, coins, xp, 'Game: ' + (game?.title ?? id));
    return { coins, xp, wallet };
  }
}
