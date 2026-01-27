import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ExamAuthService } from './exam-auth.service';
import { ExamAuthController } from './exam-auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExamStudentGuard } from './guards/exam-student.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [ExamAuthController],
  providers: [ExamAuthService, ExamStudentGuard],
  exports: [ExamAuthService, ExamStudentGuard, JwtModule],
})
export class ExamAuthModule {}
