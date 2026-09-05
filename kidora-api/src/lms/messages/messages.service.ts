import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { SCHOOL_ADMIN_ROLES } from '../common/decorators/roles.decorator';

/**
 * Role-aware messaging on the existing Conversation/Message models.
 * Allowed pairs: parent↔teacher (about a linked child the teacher teaches),
 * teacher↔student (shared class), school admin → anyone in the school.
 */
@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async conversations(u: AuthUser) {
    const rows = await this.prisma.conversation.findMany({ where: { members: { some: { userId: u.id } } }, orderBy: { createdAt: 'desc' }, include: { members: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    const otherIds = rows.flatMap((c) => c.members.filter((m) => m.userId !== u.id).map((m) => m.userId));
    const studentIds = rows.map((c) => c.studentId).filter((x): x is string => !!x);
    const [users, students] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, name: true, avatarUrl: true, role: true } }),
      this.prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } }),
    ]);
    return Promise.all(rows.map(async (c) => {
      const me = c.members.find((m) => m.userId === u.id)!; const other = users.find((x) => x.id === c.members.find((m) => m.userId !== u.id)?.userId);
      const unread = await this.prisma.message.count({ where: { conversationId: c.id, senderId: { not: u.id }, createdAt: me.lastReadAt ? { gt: me.lastReadAt } : undefined } });
      return { id: c.id, title: c.title ?? other?.name ?? 'Conversation', participant: other ?? { id: '', name: 'Unknown', avatarUrl: null, role: 'TEACHER' }, lastMessage: c.messages[0] ? { body: c.messages[0].body, createdAt: c.messages[0].createdAt } : null, unread, studentName: students.find((s) => s.id === c.studentId)?.name ?? null };
    }));
  }

  async messages(u: AuthUser, conversationId: string) {
    await this.assertMember(u.id, conversationId);
    const rows = await this.prisma.message.findMany({ where: { conversationId, deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 200 });
    await this.prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId: u.id } }, data: { lastReadAt: new Date() } });
    return rows.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt, mine: m.senderId === u.id }));
  }

  async send(u: AuthUser, conversationId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Message is empty.');
    await this.assertMember(u.id, conversationId);
    const m = await this.prisma.message.create({ data: { conversationId, senderId: u.id, body: body.trim().slice(0, 4000) } });
    const others = await this.prisma.conversationMember.findMany({ where: { conversationId, userId: { not: u.id } }, select: { userId: true } });
    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true } });
    if (others.length) await this.prisma.notification.createMany({ data: others.map((o) => ({ userId: o.userId, type: 'MESSAGE' as const, title: `Message from ${sender.name}`, body: m.body.slice(0, 120), link: `/${u.role === 'PARENT' ? 'teacher' : 'parent'}/messages/${conversationId}` })) });
    return { id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt, mine: true };
  }

  /** Find or create a DM. `studentId` scopes parent↔teacher threads to one child. */
  async open(u: AuthUser, otherId: string, studentId?: string) {
    await this.assertMayMessage(u, otherId, studentId);
    const existing = await this.prisma.conversation.findFirst({ where: { type: 'dm', studentId: studentId ?? null, AND: [{ members: { some: { userId: u.id } } }, { members: { some: { userId: otherId } } }] }, select: { id: true } });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { type: 'dm', schoolId: u.schoolId, studentId, members: { create: [{ userId: u.id }, { userId: otherId }] } }, select: { id: true } });
  }

  private async assertMember(userId: string, conversationId: string) {
    const m = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!m) throw new ForbiddenException('You are not in this conversation.');
  }

  private async assertMayMessage(u: AuthUser, otherId: string, studentId?: string) {
    const other = await this.prisma.user.findUnique({ where: { id: otherId }, select: { role: true, schoolId: true } });
    if (!other) throw new NotFoundException('User not found.');
    if (SCHOOL_ADMIN_ROLES.includes(u.role)) { if (other.schoolId !== u.schoolId && !['SUPER_ADMIN', 'ADMIN'].includes(u.role)) throw new ForbiddenException(); return; }
    if (u.role === 'PARENT' && other.role === 'TEACHER') {
      if (!studentId) throw new BadRequestException('Choose which child this conversation is about.');
      const [link, teaches] = await Promise.all([this.prisma.parentStudent.count({ where: { parentId: u.id, studentId } }), this.prisma.classEnrollment.count({ where: { studentId, class: { teachers: { some: { teacherId: otherId } } } } })]);
      if (!link || !teaches) throw new ForbiddenException('This teacher does not teach your child.'); return;
    }
    if (u.role === 'TEACHER' && other.role === 'PARENT') {
      if (!studentId) throw new BadRequestException('Choose which student this conversation is about.');
      const [link, teaches] = await Promise.all([this.prisma.parentStudent.count({ where: { parentId: otherId, studentId } }), this.prisma.classEnrollment.count({ where: { studentId, class: { teachers: { some: { teacherId: u.id } } } } })]);
      if (!link || !teaches) throw new ForbiddenException(); return;
    }
    if ((u.role === 'TEACHER' && other.role === 'CHILD') || (u.role === 'CHILD' && other.role === 'TEACHER')) {
      const teacher = u.role === 'TEACHER' ? u.id : otherId; const student = u.role === 'CHILD' ? u.id : otherId;
      const shared = await this.prisma.classEnrollment.count({ where: { studentId: student, class: { teachers: { some: { teacherId: teacher } } } } });
      if (!shared) throw new ForbiddenException('No shared class.'); return;
    }
    throw new ForbiddenException('Messaging between these roles is not allowed.');
  }
}
