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
import { ExamAuthModule } from './modules/auth/exam-auth.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AIProviderModule } from './modules/ai-provider/ai-provider.module';
import { ClassModule } from './modules/class/class.module';
import { StudentModule } from './modules/student/student.module';
import { StudentAiAnalysisModule } from './modules/student-ai-analysis/student-ai-analysis.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 优先加载根目录的 .env，然后是 apps/api/.env 作为后备
      envFilePath: [
        join(__dirname, '..', '..', '..', '.env'), // 根目录 .env
        join(__dirname, '..', '.env'), // apps/api/.env (后备)
      ],
    }),
    PrismaModule,
    QuestionModule,
    ImportModule,
    ExamModule,
    SettingsModule,
    AIModule,
    SubmissionModule,
    DebugModule,
    ExamAuthModule,
    UserModule,
    AuthModule,
    AIProviderModule,
    ClassModule,
    StudentModule,
    StudentAiAnalysisModule,
  ],
})
export class AppModule {}
