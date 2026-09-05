import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PLACEHOLDER. If your repo already has a PrismaService (very likely),
 * delete this file and update the import path in lms.module.ts and
 * every `../prisma/prisma.service` import (a single sed does it).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
