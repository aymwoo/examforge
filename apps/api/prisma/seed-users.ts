import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 创建默认管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      isActive: true,
      isApproved: true,
    },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      name: '系统管理员',
      role: 'ADMIN',
      isActive: true,
      isApproved: true,
    },
  });

  console.log('Created admin user:', admin);

  // 创建示例教师用户
  const teacherPassword = await bcrypt.hash('teacher123', 10);

  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {
      isActive: true,
      isApproved: true,
    },
    create: {
      username: 'teacher',
      email: 'teacher@example.com',
      password: teacherPassword,
      name: '示例教师',
      role: 'TEACHER',
      isActive: true,
      isApproved: true,
    },
  });

  console.log('Created teacher user:', teacher);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
