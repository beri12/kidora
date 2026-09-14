import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import type { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { VideoProcessingService } from './video-processing.service';
import type { CompleteUploadDto, PresignUploadDto, UpdateVideoDto } from './dto';

/** Extensions we are willing to put on disk, per mime family. */
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.m4v', '.ogv', '.mkv']);

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService,
    private processing: VideoProcessingService,
  ) {}

  private videoRules() {
    return {
      maxBytes: this.config.get<number>('storage.video.maxBytes')!,
      allowed: this.config.get<string[]>('storage.video.allowedTypes')!,
      ttl: this.config.get<number>('storage.video.uploadTtlSec')!,
    };
  }

  /**
   * A teacher may only touch a course they author (or co-teach), and admins
   * their own school's. Everything below funnels through this — the presign
   * route included, so an unauthorised upload is refused before any URL that
   * could write to our bucket is handed out.
   */
  private async assertCourseOwner(u: AuthUser, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, schoolId: true, instructors: { select: { userId: true } } },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const isAuthor = course.teacherId === u.id;
    const isInstructor = course.instructors.some((i) => i.userId === u.id);
    const isSchoolAdmin =
      ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(u.role) &&
      Boolean(course.schoolId) && course.schoolId === u.schoolId;
    const isPlatformAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(u.role);

    if (!isAuthor && !isInstructor && !isSchoolAdmin && !isPlatformAdmin) {
      throw new ForbiddenException("You don't have permission to modify this course.");
    }
    return course;
  }

  /** Strip everything but a known extension; the name never reaches the key. */
  private safeExtension(fileName: string, mimeType: string) {
    const ext = extname(fileName).toLowerCase();
    if (VIDEO_EXT.has(ext)) return ext;
    if (mimeType === 'video/mp4') return '.mp4';
    if (mimeType === 'video/quicktime') return '.mov';
    if (mimeType === 'video/webm') return '.webm';
    return '.bin';
  }

  /* ------------------------------------------------------------- presign */

  async presign(u: AuthUser, dto: PresignUploadDto) {
    await this.assertCourseOwner(u, dto.courseId);
    const rules = this.videoRules();

    if (!rules.allowed.includes(dto.mimeType)) {
      throw new BadRequestException('Unsupported video format. Please upload MP4, MOV, or WEBM.');
    }
    if (dto.fileSizeBytes <= 0) throw new BadRequestException('That file is empty.');
    if (dto.fileSizeBytes > rules.maxBytes) {
      throw new PayloadTooLargeException(
        `This video exceeds the maximum allowed file size (${Math.round(rules.maxBytes / 1024 / 1024)} MB).`,
      );
    }
    if (dto.lessonId) await this.assertLessonInCourse(dto.lessonId, dto.courseId);

    // Same teacher, same course, same file: hand back the session already in
    // flight rather than starting a second upload of identical bytes.
    const fingerprint = createHash('sha256')
      .update(`${u.id}|${dto.courseId}|${dto.fileName}|${dto.fileSizeBytes}|${dto.mimeType}`)
      .digest('hex');

    const existing = await this.prisma.uploadSession.findUnique({
      where: { userId_fingerprint: { userId: u.id, fingerprint } },
    });
    if (existing && existing.status !== 'COMPLETED' && existing.expiresAt > new Date()) {
      return this.describeSession(existing, dto.mimeType, rules.ttl, true);
    }
    if (existing) {
      // Expired or already finished: free the fingerprint for a fresh attempt.
      await this.prisma.uploadSession.delete({ where: { id: existing.id } });
    }

    const storageKey = `courses/${dto.courseId}/videos/${randomUUID()}${this.safeExtension(dto.fileName, dto.mimeType)}`;
    const session = await this.prisma.uploadSession.create({
      data: {
        userId: u.id,
        courseId: dto.courseId,
        lessonId: dto.lessonId ?? null,
        fileName: dto.fileName.slice(0, 255),
        fileSizeBytes: BigInt(dto.fileSizeBytes),
        mimeType: dto.mimeType,
        storageKey,
        fingerprint,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + rules.ttl * 1000),
      },
    });
    return this.describeSession(session, dto.mimeType, rules.ttl, false);
  }

  private async describeSession(
    session: { id: string; storageKey: string; token: string; expiresAt: Date; fileName: string; fileSizeBytes: bigint; status: string },
    mimeType: string, ttl: number, resumed: boolean,
  ) {
    const presigned = await this.storage.presign({ storageKey: session.storageKey, mimeType, expiresInSec: ttl });
    const apiBase = (process.env.API_PUBLIC_BASE ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, '');

    return {
      sessionId: session.id,
      storageKey: session.storageKey,
      fileName: session.fileName,
      fileSizeBytes: Number(session.fileSizeBytes),
      status: session.status,
      expiresAt: session.expiresAt,
      /** True when the same file was already being uploaded. */
      resumed,
      ...(presigned ?? {
        // No presign support (local disk): the browser PUTs to us instead, and
        // we stream it to storage rather than buffering it in memory.
        uploadUrl: `${apiBase}/api/uploads/direct/${session.token}`,
        headers: { 'Content-Type': mimeType },
        direct: false,
      }),
    };
  }

  private async assertLessonInCourse(lessonId: string, courseId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    if (lesson.courseId !== courseId) throw new ForbiddenException('That lesson belongs to another course.');
  }

  /* --------------------------------------------------------- direct PUT */

  /**
   * The local-driver counterpart of a presigned PUT. The request body is piped
   * into storage, so the API's memory holds a chunk at a time and not the
   * whole film.
   */
  async receiveDirect(u: AuthUser, token: string, stream: Readable, declaredLength?: number) {
    const session = await this.prisma.uploadSession.findUnique({ where: { token } });
    if (!session) throw new NotFoundException('That upload session is not valid.');
    if (session.userId !== u.id) throw new ForbiddenException('That upload session belongs to someone else.');
    if (session.expiresAt < new Date()) throw new BadRequestException('That upload session has expired. Start the upload again.');
    if (session.status === 'COMPLETED') throw new BadRequestException('That upload has already finished.');

    const max = this.videoRules().maxBytes;
    if (declaredLength && declaredLength > max) {
      throw new PayloadTooLargeException('This video exceeds the maximum allowed file size.');
    }

    await this.prisma.uploadSession.update({ where: { id: session.id }, data: { status: 'UPLOADING' } });
    try {
      const bytes = await this.storage.writeStream(session.storageKey, stream);
      if (bytes === 0) throw new BadRequestException('That upload arrived empty.');
      if (bytes > max) {
        await this.storage.remove(session.storageKey).catch(() => undefined);
        throw new PayloadTooLargeException('This video exceeds the maximum allowed file size.');
      }
      await this.prisma.uploadSession.update({
        where: { id: session.id }, data: { bytesReceived: BigInt(bytes) },
      });
      return { sessionId: session.id, bytesReceived: bytes };
    } catch (e) {
      await this.prisma.uploadSession.update({ where: { id: session.id }, data: { status: 'FAILED' } });
      throw e;
    }
  }

  /* ------------------------------------------------------------ complete */

  async complete(u: AuthUser, dto: CompleteUploadDto) {
    const session = await this.prisma.uploadSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('That upload session is not valid.');
    if (session.userId !== u.id) throw new ForbiddenException('That upload session belongs to someone else.');
    if (!session.courseId) throw new BadRequestException('That upload session has no course.');
    await this.assertCourseOwner(u, session.courseId);

    const lessonId = dto.contentItemId
      ? (await this.prisma.lessonContent.findUniqueOrThrow({
          where: { id: dto.contentItemId }, select: { lessonId: true },
        })).lessonId
      : session.lessonId;
    if (!lessonId) throw new BadRequestException('Say which lesson this video belongs to.');
    await this.assertLessonInCourse(lessonId, session.courseId);

    // A duration the browser measured is a hint, not a fact: clamp it so a
    // hand-crafted request cannot claim a four-second video lasts a year.
    const duration = dto.durationSeconds && dto.durationSeconds > 0
      ? Math.min(dto.durationSeconds, 24 * 60 * 60)
      : null;

    const title = (dto.title ?? session.fileName.replace(/\.[^.]+$/, '')).slice(0, 160) || 'Video';

    const result = await this.prisma.$transaction(async (tx) => {
      const item = dto.contentItemId
        ? await tx.lessonContent.update({
            where: { id: dto.contentItemId },
            data: {
              type: 'VIDEO', url: this.storage.urlFor(session.storageKey),
              ...(duration ? { durationSeconds: duration, estimatedMin: Math.max(1, Math.round(duration / 60)) } : {}),
            },
          })
        : await tx.lessonContent.create({
            data: {
              lessonId,
              type: 'VIDEO',
              title,
              url: this.storage.urlFor(session.storageKey),
              order: ((await tx.lessonContent.aggregate({ where: { lessonId }, _max: { order: true } }))._max.order ?? -1) + 1,
              ...(duration ? { durationSeconds: duration, estimatedMin: Math.max(1, Math.round(duration / 60)) } : {}),
            },
          });

      const video = await tx.videoAsset.upsert({
        where: { contentItemId: item.id },
        create: {
          contentItemId: item.id,
          storageKey: session.storageKey,
          url: this.storage.urlFor(session.storageKey),
          mimeType: session.mimeType,
          fileSizeBytes: session.bytesReceived > 0n ? session.bytesReceived : session.fileSizeBytes,
          durationSeconds: duration,
          uploadStatus: 'COMPLETED',
          processingStatus: 'PENDING',
        },
        update: {
          storageKey: session.storageKey,
          url: this.storage.urlFor(session.storageKey),
          mimeType: session.mimeType,
          uploadStatus: 'COMPLETED',
          processingStatus: 'PENDING',
          error: null,
          ...(duration ? { durationSeconds: duration } : {}),
        },
      });

      await tx.uploadSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      return { item, video };
    });

    this.processing.schedule(result.video.id);
    return { contentItem: result.item, video: this.publicVideo(result.video) };
  }

  async abort(u: AuthUser, sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('That upload session is not valid.');
    if (session.userId !== u.id) throw new ForbiddenException('That upload session belongs to someone else.');
    await this.storage.remove(session.storageKey).catch(() => undefined);
    await this.prisma.uploadSession.update({ where: { id: sessionId }, data: { status: 'ABORTED' } });
    return { ok: true };
  }

  /* --------------------------------------------------------------- video */

  private publicVideo(v: {
    id: string; contentItemId: string; url: string | null; thumbnailUrl: string | null;
    durationSeconds: number | null; fileSizeBytes: bigint; mimeType: string;
    uploadStatus: string; processingStatus: string; error: string | null;
    captionsUrl: string | null; allowDownload: boolean;
  }) {
    return {
      id: v.id,
      contentItemId: v.contentItemId,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl,
      durationSeconds: v.durationSeconds,
      fileSizeBytes: Number(v.fileSizeBytes),
      mimeType: v.mimeType,
      uploadStatus: v.uploadStatus,
      processingStatus: v.processingStatus,
      error: v.error,
      captionsUrl: v.captionsUrl,
      allowDownload: v.allowDownload,
    };
  }

  private async assertVideoOwner(u: AuthUser, videoId: string) {
    const video = await this.prisma.videoAsset.findUnique({
      where: { id: videoId },
      include: { contentItem: { select: { id: true, lessonId: true, lesson: { select: { courseId: true } } } } },
    });
    if (!video) throw new NotFoundException('Video not found.');
    await this.assertCourseOwner(u, video.contentItem.lesson.courseId);
    return video;
  }

  async status(u: AuthUser, videoId: string) {
    const video = await this.assertVideoOwner(u, videoId);
    return this.publicVideo(video);
  }

  async update(u: AuthUser, videoId: string, dto: UpdateVideoDto) {
    const video = await this.assertVideoOwner(u, videoId);

    await this.prisma.$transaction(async (tx) => {
      await tx.videoAsset.update({
        where: { id: videoId },
        data: {
          ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
          ...(dto.thumbnailUrl !== undefined
            ? { thumbnailUrl: dto.thumbnailUrl || null, thumbnailCustom: Boolean(dto.thumbnailUrl) }
            : {}),
          ...(dto.captionsUrl !== undefined ? { captionsUrl: dto.captionsUrl || null } : {}),
          ...(dto.allowDownload !== undefined ? { allowDownload: Boolean(dto.allowDownload) } : {}),
        },
      });
      await tx.lessonContent.update({
        where: { id: video.contentItemId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { body: dto.description } : {}),
          ...(dto.transcriptVtt !== undefined ? { transcriptVtt: dto.transcriptVtt || null } : {}),
          ...(dto.isRequired !== undefined ? { isRequired: Boolean(dto.isRequired) } : {}),
          ...(dto.durationSeconds !== undefined
            ? { durationSeconds: dto.durationSeconds, estimatedMin: Math.max(1, Math.round((dto.durationSeconds || 60) / 60)) }
            : {}),
        },
      });
      if (dto.isPreview !== undefined) {
        await tx.lesson.update({ where: { id: video.contentItem.lessonId }, data: { isPreview: Boolean(dto.isPreview) } });
      }
    });

    return this.status(u, videoId);
  }

  async retryProcessing(u: AuthUser, videoId: string) {
    await this.assertVideoOwner(u, videoId);
    await this.processing.retry(videoId);
    return this.status(u, videoId);
  }

  /**
   * Removes the video and the item that held it — a VIDEO item with no file is
   * nothing a student can do anything with.
   */
  async remove(u: AuthUser, videoId: string) {
    const video = await this.assertVideoOwner(u, videoId);
    await this.storage.remove(video.storageKey).catch(() => undefined);
    await this.prisma.lessonContent.delete({ where: { id: video.contentItemId } });
    return { ok: true, contentItemId: video.contentItemId };
  }
}
