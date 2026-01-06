import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionModule } from './modules/question/question.module';
import { ImportModule } from './modules/import/import.module';
import { ExamModule } from './modules/exam/exam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QuestionModule,
    ImportModule,
    ExamModule,
  ],
})
export class AppModule {}
