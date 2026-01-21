import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAIProviderSettings() {
  console.log('=== 测试AI Provider设置 ===');
  
  // 检查系统设置
  const systemSettings = await prisma.systemSetting.findMany();
  console.log('系统设置:');
  systemSettings.forEach(setting => {
    console.log(`  ${setting.key}: ${setting.value}`);
  });
  
  // 检查自定义AI Providers
  const aiProviders = await prisma.aIProvider.findMany({
    where: { isActive: true },
  });
  
  console.log('\n自定义AI Providers:');
  if (aiProviders.length === 0) {
    console.log('  没有自定义AI Provider');
  } else {
    aiProviders.forEach(provider => {
      console.log(`  ID: ${provider.id}`);
      console.log(`  名称: ${provider.name}`);
      console.log(`  API Key: ${provider.apiKey ? '已设置' : '未设置'}`);
      console.log(`  Base URL: ${provider.baseUrl || '未设置'}`);
      console.log(`  Model: ${provider.model}`);
      console.log(`  全局: ${provider.isGlobal ? '是' : '否'}`);
      console.log('  ---');
    });
  }
  
  // 检查用户设置
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
  });
  
  for (const user of users) {
    const userSettings = await prisma.userSetting.findMany({
      where: { userId: user.id },
    });
    
    if (userSettings.length > 0) {
      console.log(`\n用户 ${user.username} 的设置:`);
      userSettings.forEach(setting => {
        console.log(`  ${setting.key}: ${setting.value}`);
      });
    }
  }
}

testAIProviderSettings()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
