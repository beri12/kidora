import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const notBlank = (_o: unknown, v: unknown) => typeof v === 'string' && v.trim().length > 0;

export class PresignUploadDto {
  @ApiProperty({ description: 'The course the file belongs to. Ownership is checked against it.' })
  @IsString() courseId!: string;

  @ApiPropertyOptional({ description: 'Lesson to attach the finished item to.' })
  @IsOptional() @IsString() lessonId?: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) fileName!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) fileSizeBytes!: number;
  @ApiProperty({ example: 'video/mp4' }) @IsString() @MaxLength(120) mimeType!: string;
}

export class CompleteUploadDto {
  @ApiProperty() @IsString() sessionId!: string;

  @ApiPropertyOptional({ description: 'Attach to this existing item instead of creating one.' })
  @IsOptional() @IsString() contentItemId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;

  @ApiPropertyOptional({ description: 'Read from the browser\'s video element; verified to be sane server-side.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSeconds?: number;
}

export class UpdateVideoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSeconds?: number;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(notBlank) @IsUrl({ require_tld: false }) thumbnailUrl?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf(notBlank) @IsUrl({ require_tld: false }) captionsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200000) transcriptVtt?: string;
  @ApiPropertyOptional() @IsOptional() allowDownload?: boolean;
  @ApiPropertyOptional() @IsOptional() isRequired?: boolean;
  @ApiPropertyOptional({ description: 'Free preview: openable before enrolling.' })
  @IsOptional() isPreview?: boolean;
}

/** Where the player got to. Sent while watching, so it stays small. */
export class VideoProgressDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) positionSec!: number;
  @ApiPropertyOptional({ description: 'Seconds actually watched since the last report.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) watchedDeltaSec?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSeconds?: number;
}

export enum UploadKind { video = 'video', image = 'image', audio = 'audio', document = 'document', captions = 'captions' }

export class AbortUploadDto {
  @ApiPropertyOptional({ enum: UploadKind }) @IsOptional() @IsEnum(UploadKind) kind?: UploadKind;
}
