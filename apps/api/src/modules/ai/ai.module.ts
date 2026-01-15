import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiProgressStore } from './ai-progress.store';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    SettingsModule,
    PrismaModule,
  ],
  controllers: [AIController],
  providers: [AIService, AiProgressStore],
  exports: [AIService],
})
export class AIModule {}
