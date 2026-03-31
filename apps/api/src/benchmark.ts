import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const NUM_QUESTIONS = 500;

  console.log(`Creating dummy exam...`);
  const exam1 = await prisma.exam.create({
    data: {
      title: 'Benchmark Sequential',
      duration: 60,
      status: 'DRAFT',
    },
  });

  const exam2 = await prisma.exam.create({
    data: {
      title: 'Benchmark createMany',
      duration: 60,
      status: 'DRAFT',
    },
  });

  // Create dummy questions
  console.log(`Creating ${NUM_QUESTIONS} dummy questions...`);
  const questionIds: string[] = [];
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    const q = await prisma.question.create({
      data: {
        content: `Dummy Question ${i}`,
        type: 'SINGLE_CHOICE',
        answer: 'A',
        tags: '[]',
      },
    });
    questionIds.push(q.id);
  }

  console.log('--- Benchmark Sequential Insert ---');
  const startSequential = Date.now();
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam1.id,
        questionId: questionIds[i],
        order: i + 1,
        score: 5,
      },
    });
  }
  const endSequential = Date.now();
  const timeSequential = endSequential - startSequential;
  console.log(`Time taken (Sequential): ${timeSequential}ms`);

  console.log('--- Benchmark createMany Insert ---');
  const startCreateMany = Date.now();
  const data = questionIds.map((id, index) => ({
    examId: exam2.id,
    questionId: id,
    order: index + 1,
    score: 5,
  }));
  await prisma.examQuestion.createMany({
    data,
  });
  const endCreateMany = Date.now();
  const timeCreateMany = endCreateMany - startCreateMany;
  console.log(`Time taken (createMany): ${timeCreateMany}ms`);

  console.log(`Speedup: ${(timeSequential / timeCreateMany).toFixed(2)}x`);

  // Cleanup
  console.log('Cleaning up...');
  await prisma.examQuestion.deleteMany({
    where: { examId: { in: [exam1.id, exam2.id] } },
  });
  await prisma.exam.deleteMany({
    where: { id: { in: [exam1.id, exam2.id] } },
  });
  await prisma.question.deleteMany({
    where: { id: { in: questionIds } },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
