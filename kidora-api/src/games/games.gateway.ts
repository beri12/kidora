import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GamesService } from './games.service';

// Live multiplayer game gateway. Rooms are namespaced by game slug and
// their state is kept in Redis so multiple API instances stay in sync.
@WebSocketGateway({ namespace: '/games', cors: { origin: '*' } })
export class GamesGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('GamesGateway');
  constructor(private games: GamesService) {}

  @SubscribeMessage('game:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { game: string; room: string }) {
    client.join(body.room);
    client.data.room = body.room;
    client.data.game = body.game;
    const state = await this.games.addPlayer(body.room, body.game, {
      id: client.id,
      name: (client.handshake.auth?.name as string) ?? 'Player',
      avatarColor: '#8B5CF6',
    });
    this.server.to(body.room).emit('game:state', state);
  }

  @SubscribeMessage('game:ready')
  async onReady(@ConnectedSocket() client: Socket, @MessageBody() body: { room: string }) {
    const state = await this.games.setReady(body.room, client.id);
    this.server.to(body.room).emit('game:state', state);
  }

  @SubscribeMessage('game:answer')
  async onAnswer(@ConnectedSocket() client: Socket, @MessageBody() body: { room: string; payload: unknown }) {
    const state = await this.games.submitAnswer(body.room, client.id, body.payload);
    this.server.to(body.room).emit('game:state', state);
  }

  @SubscribeMessage('game:leave')
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { room: string }) {
    const state = await this.games.removePlayer(body.room, client.id);
    client.leave(body.room);
    this.server.to(body.room).emit('game:state', state);
  }

  async handleDisconnect(client: Socket) {
    const room = client.data?.room;
    if (!room) return;
    const state = await this.games.removePlayer(room, client.id);
    this.server.to(room).emit('game:state', state);
  }
}
