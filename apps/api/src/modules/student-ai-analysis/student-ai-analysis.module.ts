import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StudentAiAnalysisController } from './student-ai-analysis.controller';
import { StudentAiAnalysisService } from './student-ai-analysis.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudentAiAnalysisController],
  providers: [StudentAiAnalysisService],
})
export class StudentAiAnalysisModule {}
