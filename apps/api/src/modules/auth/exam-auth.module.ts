import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ExamAuthService } from './exam-auth.service';
import { ExamAuthController } from './exam-auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [ExamAuthController],
  providers: [ExamAuthService],
  exports: [ExamAuthService],
})
export class ExamAuthModule {}
