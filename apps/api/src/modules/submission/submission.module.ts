import { Module } from '@nestjs/common';
import { SubmissionController, SubmissionsController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubmissionController, SubmissionsController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
