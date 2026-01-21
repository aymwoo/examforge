import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ExamService } from './modules/exam/exam.service';

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return undefined;
  return hit.slice(prefix.length);
}

function parseIntArg(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const examId = process.env.EXAM_ID || getArgValue('examId');
  const examStudentId = process.env.EXAM_STUDENT_ID || getArgValue('examStudentId');
  const limit = parseIntArg(process.env.LIMIT || getArgValue('limit'), 100);
  const dryRunEnv = process.env.DRY_RUN;
  const dryRun = dryRunEnv == null ? true : dryRunEnv !== '0';
  const noAi = process.env.NO_AI === '1';
  const updateSubmittedAtEnv = process.env.UPDATE_SUBMITTED_AT;
  const updateSubmittedAt = updateSubmittedAtEnv === '1';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const examService = app.get(ExamService);

  const where: any = {
    gradingDetails: null,
  };

  if (examId) where.examId = examId;
  if (examStudentId) where.examStudentId = examStudentId;

  const drafts = await prisma.submission.findMany({
    where,
    orderBy: { submittedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      examId: true,
      examStudentId: true,
      answers: true,
      submittedAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'write',
        filters: { examId: examId || null, examStudentId: examStudentId || null },
        limit,
        found: drafts.length,
        noAi,
        updateSubmittedAt,
      },
      null,
      2
    )
  );

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const draft of drafts) {
    processed++;

    try {
      const exam = await prisma.exam.findUnique({
        where: { id: draft.examId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!exam) {
        console.warn(`[skip] submission=${draft.id} exam missing examId=${draft.examId}`);
        continue;
      }

      let answers: Record<string, any>;
      try {
        answers = JSON.parse(draft.answers || '{}');
      } catch {
        console.warn(`[skip] submission=${draft.id} answers not JSON`);
        continue;
      }

      const gradingResults = await examService.autoGradeSubmissionForRegrade(exam, answers, {
        noAi,
        onProgress: (p) => {
          console.log(`[progress] submission=${draft.id} ${p.current}/${p.total} ${p.message}`);
        },
      });

      const payload = {
        score: gradingResults.totalScore,
        isAutoGraded: gradingResults.isFullyAutoGraded,
        gradingDetails: JSON.stringify({
          totalScore: gradingResults.totalScore,
          maxTotalScore: gradingResults.maxTotalScore,
          details: gradingResults.details,
          isFullyAutoGraded: gradingResults.isFullyAutoGraded,
        }),
      } as const;

      if (dryRun) {
        console.log(
          `[dry-run] would update submission=${draft.id} score=${payload.score} isAutoGraded=${payload.isAutoGraded}`
        );
        continue;
      }

      await prisma.submission.update({
        where: { id: draft.id },
        data: {
          ...payload,
          ...(updateSubmittedAt ? { submittedAt: new Date() } : {}),
        },
      });

      updated++;
      console.log(`[updated] submission=${draft.id} score=${payload.score}`);
    } catch (error) {
      failed++;
      console.error(`[failed] submission=${draft.id}`, error);
    }
  }

  console.log(JSON.stringify({ processed, updated, failed }, null, 2));

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
