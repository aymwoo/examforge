import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [DebugController],
})
export class DebugModule {}
