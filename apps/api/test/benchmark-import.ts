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
      username: 'testuser_benchmark',
      password: 'testpassword',
      name: 'Test User',
      role: 'TEACHER',
    },
  });

  // Create mock students array
  const NUM_STUDENTS = 200;
  const studentsToImport = Array.from({ length: NUM_STUDENTS }).map((_, i) => ({
    studentId: `STU_BENCH_${i}_${Date.now()}`,
    name: `Student ${i}`,
    password: 'password123',
    className: 'Benchmark Class 1',
  }));

  console.log(`Starting benchmark with ${NUM_STUDENTS} students...`);
  const startTime = Date.now();

  const result = await classService.importStudentsWithClass(studentsToImport, user.id, user.role);

  const endTime = Date.now();
  console.log(`Import took ${endTime - startTime} ms`);
  console.log(`Success: ${result.success}, Failed: ${result.failed}`);

  // Cleanup
  await prismaService.student.deleteMany({
    where: {
      studentId: { startsWith: 'STU_BENCH_' },
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
