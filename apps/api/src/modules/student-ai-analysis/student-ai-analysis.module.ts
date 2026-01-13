import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { SettingsModule } from '@/modules/settings/settings.module';
import { StudentAiAnalysisController } from './student-ai-analysis.controller';
import { StudentAiAnalysisService } from './student-ai-analysis.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [StudentAiAnalysisController],
  providers: [StudentAiAnalysisService],
})
export class StudentAiAnalysisModule {}
