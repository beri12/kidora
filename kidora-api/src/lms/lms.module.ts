import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { TenancyService } from './common/tenancy.service';
import { CacheService, KIDORA_REDIS } from './common/cache.service';
import { ActivityService } from './common/activity.service';
import { AuditService } from './common/audit.service';
import { RolesGuard } from './common/guards/roles.guard';
import { AnalyticsService } from './analytics/analytics.service';
import { RewardsService } from './gamification/rewards.service';
import { StudentService } from './student/student.service';
import { StudentController } from './student/student.controller';
import { TeacherService } from './teacher/teacher.service';
import { TeacherController } from './teacher/teacher.controller';
import { SchoolService } from './school/school.service';
import { SchoolController } from './school/school.controller';
import { ParentService } from './parent/parent.service';
import { ParentController } from './parent/parent.controller';
import { QuizzesService } from './assessments/quizzes.service';
import { AssignmentsService } from './assessments/assignments.service';
import { ExamsService } from './assessments/exams.service';
import { AssessmentsController } from './assessments/assessments.controller';
import { CertificatesService } from './certificates/certificates.service';
import { CertificatesController } from './certificates/certificates.controller';
import { MessagesService } from './messages/messages.service';
import { MessagesController } from './messages/messages.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { AiTutorService } from './ai/ai-tutor.service';
import { AiController } from './ai/ai.controller';
import { KIDORA_AI_PROVIDER, UnconfiguredAiProvider } from './ai/ai-provider';
import { AttendanceController } from './attendance/attendance.controller';
import { AuthoringService } from './authoring/authoring.service';
import { AssessmentAuthoringService } from './authoring/assessment-authoring.service';
import { PublishService } from './authoring/publish.service';
import { AuthoringController } from './authoring/authoring.controller';
import { CompletionService } from './learning/completion.service';
import { LearningService } from './learning/learning.service';
import { LearningController } from './learning/learning.controller';

/**
 * Add `LmsModule` to the `imports` array of your existing AppModule.
 * Nothing else in app.module.ts or main.ts needs to change: your global
 * prefix (/api), ValidationPipe, CORS, Swagger and JWT strategy are reused.
 *
 * Three swap points (see README):
 *   1. PrismaService  -> your existing one (delete src/lms/prisma).
 *   2. JwtAuthGuard   -> your existing guard (src/lms/common/guards/jwt-auth.guard.ts).
 *   3. KIDORA_REDIS   -> your ioredis client; KIDORA_AI_PROVIDER -> your AI service.
 */
@Module({
  controllers: [StudentController, TeacherController, SchoolController, ParentController, AssessmentsController, CertificatesController, MessagesController, NotificationsController, AiController, AttendanceController, AuthoringController, LearningController],
  providers: [
    PrismaService, TenancyService, CacheService, ActivityService, AuditService, RolesGuard, AnalyticsService, RewardsService,
    StudentService, TeacherService, SchoolService, ParentService, QuizzesService, AssignmentsService, ExamsService, CertificatesService, MessagesService, AiTutorService,
    AuthoringService, AssessmentAuthoringService, PublishService, CompletionService, LearningService,
    { provide: KIDORA_REDIS, useValue: undefined }, // e.g. { provide: KIDORA_REDIS, useFactory: (r: RedisService) => r.getClient(), inject: [RedisService] }
    { provide: KIDORA_AI_PROVIDER, useClass: UnconfiguredAiProvider },
  ],
  exports: [RewardsService, TenancyService, AnalyticsService, CertificatesService, CompletionService],
})
export class LmsModule {}
