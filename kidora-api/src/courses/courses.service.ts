import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateDraftCourseDto,
  UpdateDraftCourseDto,
  SaveCurriculumDto,
  PublishCourseDto,
} from './dto/Course-wizard.dto';

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'course'
  );
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(teacherId: string, dto: CreateDraftCourseDto) {
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // Subjects are seeded, so an unknown slug means a stale client rather than
    // something worth creating on the fly — the course is saved without one.
    const subject = dto.subjectSlug
      ? await this.prisma.subject.findUnique({ where: { slug: dto.subjectSlug }, select: { id: true } })
      : null;

    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.categoryId,
        subCategory: dto.subCategoryId,
        topic: dto.topic,
        language: dto.language,
        subtitleLanguage: dto.subtitleLanguage,
        levelId: dto.levelId,
        duration: dto.duration,
        ageBand: dto.ageBand,
        isPremium: dto.isPremium ?? false,
        subjectId: subject?.id,
        slug,
        teacherId,
        status: 'DRAFT',
        published: false,
      },
      ...CoursesService.listShape,
    });
  }

  async updateDraft(teacherId: string, courseId: string, dto: UpdateDraftCourseDto) {
    await this.assertOwnedDraft(teacherId, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.categoryId,
        subCategory: dto.subCategoryId,
        topic: dto.topic,
        language: dto.language,
        subtitleLanguage: dto.subtitleLanguage,
        levelId: dto.levelId,
        duration: dto.duration,
      },
    });
  }

  async saveCurriculum(teacherId: string, courseId: string, dto: SaveCurriculumDto) {
    await this.assertOwnedDraft(teacherId, courseId);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.section.deleteMany({ where: { courseId } });

        for (const section of dto.sections) {
          const createdSection = await tx.section.create({
            data: { title: section.title, order: section.order, courseId },
          });

          if (section.lectures.length) {
            await tx.lecture.createMany({
              data: section.lectures.map((lecture) => ({
                title: lecture.title,
                order: lecture.order,
                videoUrl: lecture.videoUrl,
                videoFileName: lecture.videoFileName,
                quiz: lecture.quiz ? (lecture.quiz as any) : undefined,
                sectionId: createdSection.id,
              })),
            });
          }
        }

        return tx.course.findUnique({
          where: { id: courseId },
          include: { sections: { include: { lectures: true }, orderBy: { order: 'asc' } } },
        });
      },
      { timeout: 15000 }, // raised from Prisma's 5000ms default; multiple section/lecture inserts can exceed it
    );
  }

  async publish(teacherId: string, courseId: string, dto: PublishCourseDto) {
    await this.assertOwnedDraft(teacherId, courseId);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.section.deleteMany({ where: { courseId } });

        for (const section of dto.sections) {
          const createdSection = await tx.section.create({
            data: { title: section.title, order: section.order, courseId },
          });

          if (section.lectures.length) {
            await tx.lecture.createMany({
              data: section.lectures.map((lecture) => ({
                title: lecture.title,
                order: lecture.order,
                videoUrl: lecture.videoUrl,
                videoFileName: lecture.videoFileName,
                quiz: lecture.quiz ? (lecture.quiz as any) : undefined,
                sectionId: createdSection.id,
              })),
            });
          }
        }

        return tx.course.update({
          where: { id: courseId },
          data: {
            title: dto.basicInfo.title,
            description: dto.basicInfo.description,
            category: dto.basicInfo.categoryId,
            subCategory: dto.basicInfo.subCategoryId,
            topic: dto.basicInfo.topic,
            language: dto.basicInfo.language,
            subtitleLanguage: dto.basicInfo.subtitleLanguage,
            levelId: dto.basicInfo.levelId,
            duration: dto.basicInfo.duration,
            thumbnailUrl: dto.advanceInfo.thumbnailUrl,
            trailerUrl: dto.advanceInfo.trailerUrl,
            learningPoints: dto.advanceInfo.learningPoints,
            requirements: dto.advanceInfo.requirements,
            tags: dto.advanceInfo.tags,
            status: 'PUBLISHED',
            published: true,
          },
        });
      },
      { timeout: 15000 }, // raised from Prisma's 5000ms default
    );
  }

  /** Shape the course list UIs read: subject name and a lesson count. */
  private static readonly listShape = {
    include: {
      subject: true,
      _count: { select: { lessons: true } },
    },
  } as const;

  async listMine(teacherId: string) {
    return this.prisma.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      ...CoursesService.listShape,
    });
  }

  private async assertOwnedDraft(teacherId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== teacherId) throw new ForbiddenException('Not your course');
    return course;
  }


  async listPublished() {
  return this.prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    ...CoursesService.listShape,
  });
}

async getPublished(id: string) {
  const course = await this.prisma.course.findUnique({
    where: { id, published: true },
    include: {
      subject: true,
      _count: { select: { lessons: true } },
      sections: { include: { lectures: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
    },
  });
  if (!course) throw new NotFoundException('Course not found');
  return course;
}
}


