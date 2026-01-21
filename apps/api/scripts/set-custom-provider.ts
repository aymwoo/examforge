import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setCustomProvider() {
  console.log('=== 设置自定义AI Provider ===');
  
  // 获取第一个自定义Provider
  const customProvider = await prisma.aIProvider.findFirst({
    where: { isActive: true },
  });
  
  if (!customProvider) {
    console.log('没有找到自定义AI Provider');
    return;
  }
  
  console.log(`找到自定义Provider: ${customProvider.name} (ID: ${customProvider.id})`);
  
  // 更新系统设置，将AI_PROVIDER设置为自定义Provider的ID
  await prisma.systemSetting.upsert({
    where: { key: 'AI_PROVIDER' },
    update: { value: customProvider.id },
    create: { key: 'AI_PROVIDER', value: customProvider.id },
  });
  
  // 清空系统设置中的API Key等信息（因为这些信息在ai_providers表中）
  await prisma.systemSetting.upsert({
    where: { key: 'AI_API_KEY' },
    update: { value: '' },
    create: { key: 'AI_API_KEY', value: '' },
  });
  
  await prisma.systemSetting.upsert({
    where: { key: 'AI_BASE_URL' },
    update: { value: '' },
    create: { key: 'AI_BASE_URL', value: '' },
  });
  
  await prisma.systemSetting.upsert({
    where: { key: 'AI_MODEL' },
    update: { value: '' },
    create: { key: 'AI_MODEL', value: '' },
  });
  
  console.log('✅ 已将系统设置更新为使用自定义Provider');
  
  // 验证设置
  const settings = await prisma.systemSetting.findMany();
  console.log('\n当前系统设置:');
  settings.forEach(setting => {
    console.log(`  ${setting.key}: ${setting.value || '(空)'}`);
  });
}

setCustomProvider()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
