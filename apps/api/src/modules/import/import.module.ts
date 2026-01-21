import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { ImportController } from './import.controller';
import { ImportProgressStore } from './import-progress.store';
import { ImportService } from './import.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportProgressStore, AIService, SettingsService],
  exports: [ImportService],
})
export class ImportModule {}
