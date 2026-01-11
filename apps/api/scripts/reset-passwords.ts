import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAllPasswords() {
  const newPassword = '111111';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  console.log('正在重置所有用户密码为: 111111');
  
  const result = await prisma.user.updateMany({
    data: {
      password: hashedPassword,
    },
  });
  
  console.log(`✅ 已成功重置 ${result.count} 个用户的密码`);
  
  // 显示更新后的用户信息
  const users = await prisma.user.findMany({
    select: {
      username: true,
      name: true,
      role: true,
    },
  });
  
  console.log('\n=== 更新后的登录信息 ===');
  users.forEach(user => {
    console.log(`用户名: ${user.username} (${user.name}) - 密码: 111111`);
  });
}

resetAllPasswords()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
