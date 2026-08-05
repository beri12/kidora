import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

// Real-time chat gateway.
// - JWT auth on connection (token in handshake.auth.token)
// - Presence tracked per-user; typing + read receipts broadcast to rooms
// - Rooms are conversation ids. Use the Redis adapter (see main.ts) to scale
//   horizontally across multiple API instances.
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');
  private online = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(private chat: ChatService, private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload: any = this.jwt.verify(token, { secret: process.env.JWT_SECRET });
      client.data.userId = payload.sub;
      const set = this.online.get(payload.sub) ?? new Set();
      set.add(client.id);
      this.online.set(payload.sub, set);
      // Join a personal room so we can push notifications to a user anywhere.
      client.join('user:' + payload.sub);
      this.broadcastPresence(payload.sub, true);
    } catch {
      client.emit('chat:error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;
    const set = this.online.get(userId);
    set?.delete(client.id);
    if (set && set.size === 0) { this.online.delete(userId); this.broadcastPresence(userId, false); }
  }

  private broadcastPresence(userId: string, online: boolean) {
    this.server.emit('chat:presence', { userId, online, at: Date.now() });
  }

  @SubscribeMessage('chat:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    if (!(await this.chat.isMember(body.conversationId, client.data.userId))) return;
    client.join(body.conversationId);
    const history = await this.chat.messages(body.conversationId);
    client.emit('chat:history', { conversationId: body.conversationId, messages: history.reverse() });
  }

  @SubscribeMessage('chat:message')
  async onMessage(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; body: string; type?: string; attachmentUrl?: string; replyToId?: string }) {
    if (!(await this.chat.isMember(body.conversationId, client.data.userId))) return;
    const msg = await this.chat.saveMessage(body.conversationId, client.data.userId, body.body, body.type, body.attachmentUrl, body.replyToId);
    this.server.to(body.conversationId).emit('chat:message', msg);            // delivered to room
    this.server.to(body.conversationId).emit('chat:delivered', { id: msg.id }); // delivery receipt
    return { ok: true, id: msg.id }; // ACK back to sender
  }

  @SubscribeMessage('chat:typing')
  onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; typing: boolean }) {
    client.to(body.conversationId).emit('chat:typing', { userId: client.data.userId, typing: body.typing });
  }

  @SubscribeMessage('chat:read')
  async onRead(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }) {
    await this.chat.markRead(body.conversationId, client.data.userId);
    client.to(body.conversationId).emit('chat:read', { conversationId: body.conversationId, userId: client.data.userId, at: Date.now() });
  }

  @SubscribeMessage('chat:react')
  async onReact(@ConnectedSocket() client: Socket, @MessageBody() body: { messageId: string; conversationId: string; emoji: string }) {
    const msg = await this.chat.react(body.messageId, client.data.userId, body.emoji);
    this.server.to(body.conversationId).emit('chat:reaction', { id: msg.id, reactions: msg.reactions });
  }

  @SubscribeMessage('chat:edit')
  async onEdit(@ConnectedSocket() client: Socket, @MessageBody() body: { messageId: string; conversationId: string; body: string }) {
    const msg = await this.chat.editMessage(body.messageId, body.body);
    this.server.to(body.conversationId).emit('chat:edited', msg);
  }

  @SubscribeMessage('chat:delete')
  async onDelete(@ConnectedSocket() client: Socket, @MessageBody() body: { messageId: string; conversationId: string }) {
    const msg = await this.chat.softDelete(body.messageId);
    this.server.to(body.conversationId).emit('chat:deleted', { id: msg.id });
  }

  // Server-side helper other services can call to push a notification to a user.
  pushToUser(userId: string, event: string, payload: unknown) {
    this.server.to('user:' + userId).emit(event, payload);
  }
}
