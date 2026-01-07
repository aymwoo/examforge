import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [AIController],
  providers: [AIService],
})
export class AIModule {}
