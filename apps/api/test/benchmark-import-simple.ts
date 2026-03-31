import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClassService } from '../src/modules/class/class.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const classService = app.get(ClassService);
  const prismaService = app.get(PrismaService);

  // Setup mock user
  const user = await prismaService.user.create({
    data: {
      username: 'testuser_benchmark2',
      password: 'testpassword',
      name: 'Test User 2',
      role: 'TEACHER',
    },
  });

  // Setup mock class
  const classData = await prismaService.class.create({
    data: {
      code: 'BENCH_CLASS_2',
      name: 'Benchmark Class 2',
      createdBy: user.id,
    },
  });

  // Create mock students array
  const NUM_STUDENTS = 200;
  const studentsToImport = Array.from({ length: NUM_STUDENTS }).map((_, i) => ({
    studentId: `STU_BENCH2_${i}_${Date.now()}`,
    name: `Student ${i}`,
    password: 'password123',
  }));

  console.log(`Starting simple benchmark with ${NUM_STUDENTS} students...`);
  const startTime = Date.now();

  const result = await classService.importStudents(
    classData.id,
    studentsToImport,
    user.id,
    user.role
  );

  const endTime = Date.now();
  console.log(`Import took ${endTime - startTime} ms`);
  console.log(`Success: ${result.success}, Failed: ${result.failed}`);

  // Cleanup
  await prismaService.student.deleteMany({
    where: {
      studentId: { startsWith: 'STU_BENCH2_' },
    },
  });

  await prismaService.class.deleteMany({
    where: {
      createdBy: user.id,
    },
  });

  await prismaService.user.delete({
    where: { id: user.id },
  });

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
