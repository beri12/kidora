import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTicketDto, ReplyTicketDto, UpdateTicketDto } from './dto/support.dto';

/** Who may see and manage everyone's tickets. */
const STAFF: Role[] = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  private isStaff(u: AuthUser) { return STAFF.includes(u.role); }

  /** Short, unambiguous reference a user can quote: KID-4F2A9C. */
  private reference() {
    return 'KID-' + randomBytes(3).toString('hex').toUpperCase();
  }

  async list(u: AuthUser, status?: string) {
    const where: Prisma.SupportTicketWhereInput = {
      // A normal user only ever sees their own tickets.
      ...(this.isStaff(u) ? {} : { requesterId: u.id }),
      ...(status && status !== 'all' ? { status: status as never } : {}),
    };
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
      select: {
        id: true, reference: true, subject: true, category: true, status: true, priority: true,
        createdAt: true, updatedAt: true, resolvedAt: true,
        requester: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async get(u: AuthUser, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (!this.isStaff(u) && ticket.requesterId !== u.id) {
      throw new ForbiddenException('That ticket belongs to someone else.');
    }
    return {
      ...ticket,
      // Internal notes are for staff only and must never reach the requester.
      messages: ticket.messages.filter((m) => this.isStaff(u) || !m.internal),
    };
  }

  async create(u: AuthUser, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        reference: this.reference(),
        subject: dto.subject.trim(),
        category: dto.category ?? 'GENERAL',
        requesterId: u.id,
        schoolId: u.schoolId,
        messages: { create: { authorId: u.id, body: dto.message.trim() } },
      },
      include: { messages: true },
    });
  }

  async reply(u: AuthUser, id: string, dto: ReplyTicketDto) {
    // Reuses get() so the same ownership rule applies to replying.
    const ticket = await this.get(u, id);
    if (ticket.status === 'CLOSED') throw new ForbiddenException('This ticket is closed.');

    const message = await this.prisma.supportMessage.create({
      data: { ticketId: id, authorId: u.id, body: dto.body.trim() },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // A staff reply moves an open ticket forward; a requester reply reopens a
    // resolved one, because they clearly still need help.
    const next = this.isStaff(u)
      ? ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status
      : ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status;
    await this.prisma.supportTicket.update({ where: { id }, data: { status: next, updatedAt: new Date() } });

    return message;
  }

  async update(u: AuthUser, id: string, dto: UpdateTicketDto) {
    if (!this.isStaff(u)) throw new ForbiddenException('Only support staff can change a ticket.');
    await this.get(u, id);
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status, resolvedAt: dto.status === 'RESOLVED' ? new Date() : null } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId || null } : {}),
      },
    });
  }

  /** A requester may close their own ticket once they are happy. */
  async close(u: AuthUser, id: string) {
    const ticket = await this.get(u, id);
    if (!this.isStaff(u) && ticket.requesterId !== u.id) throw new ForbiddenException('Not your ticket.');
    return this.prisma.supportTicket.update({ where: { id }, data: { status: 'CLOSED', resolvedAt: new Date() } });
  }
}
