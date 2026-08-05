import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // All conversations a user belongs to, newest activity first.
  async conversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: { conversation: { include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    return memberships.map((m) => ({
      id: m.conversation.id,
      type: m.conversation.type,
      title: m.conversation.title,
      lastReadAt: m.lastReadAt,
      lastMessage: m.conversation.messages[0] ?? null,
    }));
  }

  async ensureDm(userA: string, userB: string) {
    // Find an existing dm shared by both users.
    const existing = await this.prisma.conversation.findFirst({
      where: { type: 'dm', members: { some: { userId: userA } }, AND: { members: { some: { userId: userB } } } },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { type: 'dm', members: { create: [{ userId: userA }, { userId: userB }] } },
    });
  }

  async createGroup(type: string, title: string, memberIds: string[]) {
    return this.prisma.conversation.create({
      data: { type, title, members: { create: memberIds.map((userId, i) => ({ userId, role: i === 0 ? 'admin' : 'member' })) } },
    });
  }

  messages(conversationId: string, before?: string) {
    return this.prisma.message.findMany({
      where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
  }

  async isMember(conversationId: string, userId: string) {
    const m = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    return !!m;
  }

  saveMessage(conversationId: string, senderId: string, body: string, type = 'text', attachmentUrl?: string, replyToId?: string) {
    return this.prisma.message.create({
      data: { conversationId, senderId, body, type, attachmentUrl, replyToId, readBy: [senderId] },
    });
  }

  async react(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    const reactions: Record<string, string[]> = (msg?.reactions as any) ?? {};
    const list = new Set(reactions[emoji] ?? []);
    list.has(userId) ? list.delete(userId) : list.add(userId);
    reactions[emoji] = [...list];
    return this.prisma.message.update({ where: { id: messageId }, data: { reactions } });
  }

  async markRead(conversationId: string, userId: string) {
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  editMessage(messageId: string, body: string) {
    return this.prisma.message.update({ where: { id: messageId }, data: { body, editedAt: new Date() } });
  }

  softDelete(messageId: string) {
    return this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), body: '' } });
  }

  search(conversationId: string, q: string) {
    return this.prisma.message.findMany({
      where: { conversationId, body: { contains: q, mode: 'insensitive' }, deletedAt: null },
      orderBy: { createdAt: 'desc' }, take: 25,
    });
  }
}
