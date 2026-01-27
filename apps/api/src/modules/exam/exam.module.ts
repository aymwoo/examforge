import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { ExamAuthModule } from '../auth/exam-auth.module';

@Module({
  imports: [AIModule, PrismaModule, SettingsModule, ExamAuthModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
