import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionModule } from './modules/question/question.module';
import { ImportModule } from './modules/import/import.module';
import { ExamModule } from './modules/exam/exam.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AIModule } from './modules/ai/ai.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { DebugModule } from './modules/debug/debug.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QuestionModule,
    ImportModule,
    ExamModule,
    SettingsModule,
    AIModule,
    SubmissionModule,
    DebugModule,
    AuthModule,
  ],
})
export class AppModule {}
