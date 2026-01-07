import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
    SettingsModule,
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
