import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from '../dto/auth.dto';

export type ProfileInput = Partial<
  Pick<RegisterDto, 'schoolName' | 'country' | 'districtName' | 'region' | 'schoolCode' | 'gradeLevel'>
> & {
  /** YYYY-MM-DD, students only. */
  dateOfBirth?: string;
  /** A school picked from search without its code: recorded as a request only. */
  schoolId?: string;
};

/** Kidora is for ages 3–18; a date outside that is a typo, not a learner. */
export function parseDateOfBirth(raw: string, now = new Date()): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw ?? '');
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!d || d.getUTCMonth() !== +m![2] - 1 || d.getUTCDate() !== +m![3]) {
    throw new BadRequestException('Enter a valid date of birth.');
  }
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  if (age < 3 || age > 18) throw new BadRequestException('Students on Kidora are between 3 and 18 years old. Please check the date of birth.');
  return d;
}

@Injectable()
export class RegistrationService {
  constructor(private prisma: PrismaService) {}

  /** Join codes skip look-alike characters (0/O, 1/I) so they survive being read aloud. */
  private code(len = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(randomBytes(len)).map((b) => alphabet[b % alphabet.length]).join('');
  }

  private async uniqueJoinCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const c = this.code();
      if (!(await tx.school.findUnique({ where: { joinCode: c }, select: { id: true } }))) return c;
    }
    return this.code(8);
  }

  private slugify(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base = this.slugify(name) || 'school';
    for (let i = 0; i < 20; i++) {
      const slug = i === 0 ? base : `${base}-${i}`;
      if (!(await tx.school.findUnique({ where: { slug }, select: { id: true } }))) return slug;
    }
    return `${base}-${this.code(4).toLowerCase()}`;
  }

  /** Append-only feed the teacher/school dashboards read. Inlined to avoid a cross-module dependency. */
  private logActivity(tx: Prisma.TransactionClient, data: { userId: string; schoolId?: string | null; type: 'STUDENT_REGISTERED' | 'TEACHER_REGISTERED'; title: string }) {
    return tx.activityEvent.create({ data: { ...data, meta: {} } });
  }

  /**
   * `dto` is the role-specific part of a sign-up. It comes from the email
   * registration form or, for phone and social accounts, from the "How will
   * you use Kidora?" step — both carry the same optional fields.
   */
  async applyProfile(user: Pick<User, 'id' | 'name' | 'role' | 'schoolId'>, dto: ProfileInput) {
    return this.prisma.$transaction(async (tx) => {
      let schoolId = user.schoolId ?? null;
      let districtId: string | null = null;
      let requestedSchoolId: string | null = null;
      let dateOfBirth: Date | null = null;

      switch (user.role) {
        case Role.SCHOOL_ADMIN:
        case Role.SCHOOL_LEADER: {
          if (!dto.schoolName?.trim()) throw new BadRequestException('School name is required.');
          if (!schoolId) {
            const school = await tx.school.create({
              data: {
                name: dto.schoolName.trim(),
                country: dto.country?.trim() || null,
                slug: await this.uniqueSlug(tx, dto.schoolName),
                joinCode: await this.uniqueJoinCode(tx),
                settings: { create: {} },
              },
            });
            schoolId = school.id;
            // Grades 1-8 so classes can be created immediately; safe to delete.
            await tx.grade.createMany({
              data: Array.from({ length: 8 }, (_, i) => ({ schoolId: school.id, level: i + 1, name: `Grade ${i + 1}` })),
              skipDuplicates: true,
            });
            await this.logActivity(tx, { userId: user.id, schoolId: school.id, type: 'TEACHER_REGISTERED', title: `${school.name} registered on Kidora` });
          }
          break;
        }

        case Role.DISTRICT_ADMIN: {
          if (!dto.districtName?.trim()) throw new BadRequestException('District name is required.');
          const district = await tx.district.create({ data: { name: dto.districtName.trim(), region: dto.region?.trim() || '' } });
          districtId = district.id;
          break;
        }

        case Role.TEACHER: {
          if (dto.schoolCode?.trim()) schoolId = await this.resolveSchoolCode(tx, dto.schoolCode);
          else if (dto.schoolId) requestedSchoolId = await this.requestableSchool(tx, dto.schoolId);
          break;
        }

        case Role.CHILD: {
          if (dto.schoolCode?.trim()) schoolId = await this.resolveSchoolCode(tx, dto.schoolCode);
          else if (dto.schoolId) requestedSchoolId = await this.requestableSchool(tx, dto.schoolId);
          if (dto.dateOfBirth) dateOfBirth = parseDateOfBirth(dto.dateOfBirth);
          await tx.rewardWallet.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
          break;
        }

        default:
          // PARENT and everyone else: nothing extra. Children are linked later
          // by the school or by an invite code.
          break;
      }

      // Grade only resolves once the school is known.
      let gradeId: string | null = null;
      if (user.role === Role.CHILD && schoolId && dto.gradeLevel) {
        const level = Number(String(dto.gradeLevel).replace(/\D/g, ''));
        if (level) {
          const grade = await tx.grade.upsert({
            where: { schoolId_level: { schoolId, level } },
            create: { schoolId, level, name: `Grade ${level}` },
            update: {},
          });
          gradeId = grade.id;
        }
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          schoolId, districtId, gradeId, displayName: user.name.split(' ')[0], lastActiveAt: new Date(),
          // A school joined by code replaces any earlier request.
          requestedSchoolId: schoolId ? null : requestedSchoolId,
          ...(dateOfBirth ? { dateOfBirth } : {}),
          ...(user.role === Role.CHILD && dto.gradeLevel?.trim() ? { gradeLevel: dto.gradeLevel.trim().slice(0, 40) } : {}),
        },
      });

      if (user.role === Role.CHILD && schoolId) {
        await this.logActivity(tx, { userId: user.id, schoolId, type: 'STUDENT_REGISTERED', title: `${user.name} joined the school` });
      }

      return updated;
    });
  }

  /** A school picked from search must exist and be active; it is only a request. */
  private async requestableSchool(tx: Prisma.TransactionClient, id: string) {
    const school = await tx.school.findFirst({ where: { id, active: true }, select: { id: true } });
    if (!school) throw new BadRequestException('We couldn’t find that school. Search again or leave it blank.');
    return school.id;
  }

  private async resolveSchoolCode(tx: Prisma.TransactionClient, code: string) {
    const school = await tx.school.findUnique({ where: { joinCode: code.trim().toUpperCase() }, select: { id: true, active: true } });
    if (!school) throw new BadRequestException('That school code is not valid.');
    if (!school.active) throw new ConflictException('That school is not accepting new members.');
    return school.id;
  }

  /** School admins show or rotate the code teachers and students type at signup. */
  async rotateJoinCode(schoolId: string) {
    return this.prisma.$transaction(async (tx) =>
      tx.school.update({ where: { id: schoolId }, data: { joinCode: await this.uniqueJoinCode(tx) }, select: { joinCode: true } }),
    );
  }
}