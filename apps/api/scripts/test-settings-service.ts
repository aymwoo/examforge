import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCustomProviderLogic() {
  console.log('=== 测试自定义Provider逻辑 ===');

  // 获取系统设置
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  const provider = settingsMap.get('AI_PROVIDER') || 'openai';
  console.log(`当前Provider: ${provider}`);

  // 检查是否是自定义Provider (UUID格式)
  const isCustomProvider = provider !== 'openai' && provider !== 'qwen' && provider !== 'custom';
  console.log(`是否为自定义Provider: ${isCustomProvider}`);

  if (isCustomProvider) {
    // 获取自定义Provider信息
    const customProvider = await prisma.aIProvider.findUnique({
      where: { id: provider, isActive: true },
    });

    if (customProvider) {
      console.log('\n自定义Provider信息:');
      console.log(`  名称: ${customProvider.name}`);
      console.log(`  API Key: ${customProvider.apiKey ? '已设置' : '未设置'}`);
      console.log(`  Base URL: ${customProvider.baseUrl || '未设置'}`);
      console.log(`  Model: ${customProvider.model}`);

      console.log('\n✅ 自定义Provider配置获取成功，测试连接应该可以工作');
    } else {
      console.log('\n❌ 未找到对应的自定义Provider');
    }
  } else {
    console.log('\n使用系统内置Provider');
  }
}

testCustomProviderLogic()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
