import { Module } from '@nestjs/common';
import { AIProviderService } from './ai-provider.service';
import { AIProviderController } from './ai-provider.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [AIProviderController],
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class AIProviderModule {}
