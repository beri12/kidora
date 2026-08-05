import { Injectable } from '@nestjs/common';
import { CacheService } from '../infrastructure/cache/cache.service';

export interface Player { id: string; name: string; score: number; avatarColor: string; ready: boolean; }
export interface GameState { game: string; players: Player[]; round: number; prompt?: string; status: 'lobby' | 'playing' | 'over'; }

const roomKey = (room: string) => 'game:room:' + room;

// Simple math-prompt generator; swap per-subject logic here.
function nextPrompt() {
  const a = 2 + Math.floor(Math.random() * 9), b = 2 + Math.floor(Math.random() * 9);
  return { prompt: a + ' + ' + b + ' = ?', answer: a + b };
}

@Injectable()
export class GamesService {
  constructor(private cache: CacheService) {}

  private async load(room: string, game = 'math-balloon'): Promise<GameState> {
    return (await this.cache.get<GameState>(roomKey(room))) ?? { game, players: [], round: 0, status: 'lobby' };
  }
  private async save(room: string, state: GameState) { await this.cache.set(roomKey(room), state, 3600); return state; }

  async addPlayer(room: string, game: string, p: { id: string; name: string; avatarColor: string }) {
    const state = await this.load(room, game);
    if (!state.players.find((x) => x.id === p.id)) state.players.push({ ...p, score: 0, ready: false });
    return this.save(room, state);
  }

  async removePlayer(room: string, id: string) {
    const state = await this.load(room);
    state.players = state.players.filter((p) => p.id !== id);
    if (state.players.length === 0) state.status = 'lobby';
    return this.save(room, state);
  }

  async setReady(room: string, id: string) {
    const state = await this.load(room);
    const p = state.players.find((x) => x.id === id);
    if (p) p.ready = true;
    // start when everyone (min 1) is ready
    if (state.players.length > 0 && state.players.every((x) => x.ready)) {
      state.status = 'playing';
      state.round = 1;
      const q = nextPrompt();
      state.prompt = q.prompt;
      (state as any).answer = q.answer;
    }
    return this.save(room, state);
  }

  async submitAnswer(room: string, id: string, payload: unknown) {
    const state = await this.load(room);
    if (state.status !== 'playing') return state;
    const correct = Number(payload) === (state as any).answer;
    const p = state.players.find((x) => x.id === id);
    if (p && correct) p.score += 10;
    if (correct) {
      state.round += 1;
      if (state.round > 5) { state.status = 'over'; }
      else { const q = nextPrompt(); state.prompt = q.prompt; (state as any).answer = q.answer; }
    }
    return this.save(room, state);
  }
}
