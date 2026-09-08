// 




import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { EmailModule } from './infrastructure/email/email.module';
import { SmsModule } from './infrastructure/sms/sms.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { TeachersModule } from './teachers/teachers.module';
import { PaymentsModule } from './payments/payments.module';
import { GamesModule } from './games/games.module';
import { RewardsModule } from './rewards/rewards.module';
import { ProgressModule } from './progress/progress.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificatesModule } from './certificates/certificates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

// Kidora expansion modules
import { AvatarModule } from './avatar/avatar.module';
import { EconomyModule } from './economy/economy.module';
import { AiTutorModule } from './ai-tutor/ai-tutor.module';
import { LearningPathModule } from './learning-path/learning-path.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ChatModule } from './chat/chat.module';
import { CalendarModule } from './calendar/calendar.module';
import { SupportModule } from './support/support.module';
import { AiModule } from './modules/ai/ai.module';

// Kidora school LMS (student / teacher / school / parent dashboards,
// assessments, gamification pipeline, tenancy). All routes live under
// /api/student, /api/teacher, /api/school, /api/parent and /api/lms/* so
// they never collide with the existing modules above.
import { LmsModule } from './lms/lms.module';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import mailConfig from './config/mail.config';
import storageConfig from './config/storage.config';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, mailConfig, storageConfig],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    CacheModule,
    StorageModule,
    EmailModule,
    SmsModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    TeachersModule,
    PaymentsModule,
    GamesModule,
    RewardsModule,
    ProgressModule,
    QuizzesModule,
    CertificatesModule,
    NotificationsModule,
    AnalyticsModule,
    HealthModule,
    AvatarModule,
    EconomyModule,
    AiTutorModule,
    LearningPathModule,
    SubscriptionsModule,
    InvoicesModule,
    ChatModule,
    CalendarModule,
    SupportModule,
    AiModule,
    RedisModule,
    LmsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
