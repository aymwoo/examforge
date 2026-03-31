import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Setting up benchmark data...');

  // Create 100 questions
  const questionIds = [];
  for (let i = 0; i < 100; i++) {
    const q = await prisma.question.create({
      data: {
        content: 'Bench question ' + i,
        type: 'SINGLE_CHOICE',
        answer: 'A',
        difficulty: 1,
        status: 'PUBLISHED',
        tags: '[]',
      },
    });
    questionIds.push(q.id);
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  const examTitle = 'Benchmark Exam';
  const duration = 60;

  // Create exam
  const exam = await prisma.exam.create({
    data: {
      title: examTitle,
      duration,
      status: 'DRAFT',
    },
  });

  console.log(`Starting baseline benchmark for ${questions.length} questions...`);

  const startTime = Date.now();

  // The loop from the code:
  for (let i = 0; i < questions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: questions[i].id,
        order: i + 1,
        score: 1,
      },
    });
  }

  const endTime = Date.now();
  console.log(`Baseline loop took ${endTime - startTime}ms`);

  // Let's also test createMany to see the difference
  const exam2 = await prisma.exam.create({
    data: {
      title: examTitle + ' 2',
      duration,
      status: 'DRAFT',
    },
  });

  console.log(`Starting optimized benchmark for ${questions.length} questions...`);
  const optStartTime = Date.now();

  const examQuestionsData = questions.map((q, i) => ({
    examId: exam2.id,
    questionId: q.id,
    order: i + 1,
    score: 1,
  }));

  await prisma.examQuestion.createMany({
    data: examQuestionsData,
  });

  const optEndTime = Date.now();
  console.log(`Optimized createMany took ${optEndTime - optStartTime}ms`);

  // Cleanup
  await prisma.examQuestion.deleteMany({
    where: { examId: { in: [exam.id, exam2.id] } },
  });
  await prisma.exam.deleteMany({
    where: { id: { in: [exam.id, exam2.id] } },
  });
  await prisma.question.deleteMany({
    where: { id: { in: questionIds } },
  });

  await prisma.$disconnect();
}

run().catch(console.error);
