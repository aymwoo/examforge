import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function listUsers() {
  console.log('=== 当前数据库中的用户 ===');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    console.log('数据库中没有用户');
    return;
  }

  users.forEach((user, index) => {
    console.log(`${index + 1}. 用户名: ${user.username}`);
    console.log(`   姓名: ${user.name}`);
    console.log(`   邮箱: ${user.email || '未设置'}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   状态: ${user.isActive ? '激活' : '禁用'}`);
    console.log(`   创建时间: ${user.createdAt.toLocaleString('zh-CN')}`);
    console.log('---');
  });
}

async function resetPassword(username: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const user = await prisma.user.update({
    where: { username },
    data: { password: hashedPassword },
  });

  console.log(`✅ 用户 ${username} 的密码已重置为: ${newPassword}`);
}

async function main() {
  await listUsers();
  
  console.log('\n=== 默认登录信息 ===');
  console.log('管理员账号:');
  console.log('  用户名: admin');
  console.log('  密码: admin123');
  console.log('');
  console.log('教师账号:');
  console.log('  用户名: teacher');
  console.log('  密码: teacher123');
  
  // 如果需要重置密码，取消下面的注释
  // await resetPassword('admin', '111111');
  // await resetPassword('teacher', '111111');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
