import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/profile.dto';

/** Defaults returned for any preference the user has never set. */
const DEFAULT_SETTINGS = {
  language: 'en',
  appearance: 'system',
  difficulty: 'normal',
  leaderboardVisible: true,
  notifications: { assignments: true, exams: true, messages: true, achievements: true, email: false },
};

const PROFILE_SELECT = {
  id: true, name: true, displayName: true, email: true, phone: true, phoneVerified: true,
  role: true, points: true, streak: true, avatarColor: true, avatarUrl: true,
  schoolId: true, districtId: true, gradeId: true, settings: true,
  school: { select: { id: true, name: true } },
  grade: { select: { id: true, name: true, level: true } },
  subscription: { select: { plan: true, status: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  private shape(user: any) {
    const stored = (user?.settings ?? {}) as Record<string, unknown>;
    return {
      ...user,
      // Merged so a client always receives every key, even ones added after
      // this user last saved their preferences.
      settings: {
        ...DEFAULT_SETTINGS,
        ...stored,
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(stored.notifications as object ?? {}) },
      },
    };
  }

  async me(userId: string) {
    return this.shape(await this.prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT }));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { ...dto }, select: PROFILE_SELECT });
    // displayName and avatar are not part of the cached tenancy, but role and
    // school could be changed by an admin path later; keeping the bust here
    // means the cache can never serve a stale profile after a write.
    await this.cache.bustTenancy(userId);
    return this.shape(user);
  }

  async settings(userId: string) {
    return (await this.me(userId)).settings;
  }

  /** Merges into the stored preferences so a partial save cannot wipe the rest. */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const current = await this.settings(userId);
    const merged = {
      ...current,
      ...dto,
      notifications: { ...current.notifications, ...(dto.notifications ?? {}) },
    };
    await this.prisma.user.update({ where: { id: userId }, data: { settings: merged as Prisma.InputJsonValue } });
    return merged;
  }
}
