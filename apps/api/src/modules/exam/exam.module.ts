import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AIModule, PrismaModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
