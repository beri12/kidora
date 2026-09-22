import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

const run = promisify(execFile);

/**
 * Post-upload work on a video: read its real duration, and take a frame for
 * the thumbnail.
 *
 * This project has Redis but no BullMQ or any other queue package, so this is
 * not a queue worker — it is a background task whose state lives in the
 * database (VideoAsset.processingStatus) rather than in memory. That means a
 * restart mid-processing leaves a row in PROCESSING which `retry` picks up,
 * and swapping in a real queue later only replaces how `process()` is invoked.
 * What it must never do is block the HTTP request, so callers fire and forget.
 *
 * ffprobe/ffmpeg are used when they exist on PATH. When they do not, the
 * duration the browser measured is used instead and no thumbnail is generated
 * — the video still becomes READY and playable, which is the honest outcome
 * rather than parking it in PROCESSING forever.
 */
@Injectable()
export class VideoProcessingService {
  private readonly log = new Logger(VideoProcessingService.name);
  private tools: { ffprobe: boolean; ffmpeg: boolean } | null = null;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private config: ConfigService,
  ) {}

  private async available() {
    if (this.tools) return this.tools;
    const has = async (bin: string) => {
      try { await run(bin, ['-version']); return true; } catch { return false; }
    };
    this.tools = { ffprobe: await has('ffprobe'), ffmpeg: await has('ffmpeg') };
    if (!this.tools.ffprobe) {
      this.log.warn('ffprobe not found: video duration falls back to what the browser reported, and no thumbnails are generated.');
    }
    return this.tools;
  }

  /** Kick processing without making the caller wait for it. */
  schedule(videoId: string) {
    setImmediate(() => {
      this.process(videoId).catch((e) => this.log.error(`processing ${videoId} failed: ${e.message}`));
    });
  }

  async process(videoId: string) {
    const video = await this.prisma.videoAsset.findUnique({ where: { id: videoId } });
    if (!video || video.uploadStatus !== 'COMPLETED') return;

    await this.prisma.videoAsset.update({
      where: { id: videoId },
      data: { processingStatus: 'PROCESSING', error: null },
    });

    try {
      const tools = await this.available();
      const localPath = this.localPathFor(video.storageKey);
      const patch: { durationSeconds?: number; thumbnailUrl?: string } = {};

      if (tools.ffprobe && localPath) {
        const probed = await this.probeDuration(localPath);
        if (probed) patch.durationSeconds = probed;
      }
      if (tools.ffmpeg && localPath && !video.thumbnailCustom) {
        const thumb = await this.grabThumbnail(localPath, patch.durationSeconds ?? video.durationSeconds ?? 0);
        if (thumb) patch.thumbnailUrl = thumb;
      }

      await this.prisma.videoAsset.update({
        where: { id: videoId },
        data: { ...patch, processingStatus: 'READY' },
      });

      // Keep the item's own duration in step: the player and the course totals
      // read LessonContent, not VideoAsset.
      const seconds = patch.durationSeconds ?? video.durationSeconds;
      if (seconds) {
        await this.prisma.lessonContent.update({
          where: { id: video.contentItemId },
          data: { durationSeconds: seconds, estimatedMin: Math.max(1, Math.round(seconds / 60)) },
        });
      }
    } catch (e) {
      await this.prisma.videoAsset.update({
        where: { id: videoId },
        data: { processingStatus: 'FAILED', error: (e as Error).message.slice(0, 500) },
      });
      throw e;
    }
  }

  /** Only the local driver exposes a path ffmpeg can read directly. */
  private localPathFor(storageKey: string): string | null {
    if (this.config.get('storage.driver') === 's3') return null;
    return join(process.cwd(), this.config.get<string>('storage.localDir')!.replace(/^\.\//, ''), storageKey);
  }

  private async probeDuration(path: string): Promise<number | null> {
    const { stdout } = await run('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path,
    ]);
    const seconds = Math.round(Number(stdout.trim()));
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  private async grabThumbnail(path: string, durationSeconds: number): Promise<string | null> {
    // A frame a little way in: frame zero of a video is very often black.
    const at = durationSeconds > 4 ? Math.min(10, Math.floor(durationSeconds * 0.1)) : 0;
    const dir = this.config.get<string>('storage.localDir')!;
    const key = `thumbnails/${randomUUID()}.jpg`;
    const out = join(process.cwd(), dir.replace(/^\.\//, ''), key);
    await fs.mkdir(join(out, '..'), { recursive: true });
    await run('ffmpeg', ['-y', '-ss', String(at), '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', out]);
    return this.storage.urlFor(key);
  }

  /** Re-run a failed or interrupted job. */
  async retry(videoId: string) {
    await this.prisma.videoAsset.update({
      where: { id: videoId }, data: { processingStatus: 'PENDING', error: null },
    });
    this.schedule(videoId);
  }
}
