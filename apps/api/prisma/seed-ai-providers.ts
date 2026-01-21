import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建默认全局AI Provider
  const globalProvider = await prisma.aIProvider.upsert({
    where: { id: 'global-qwen' },
    update: {},
    create: {
      id: 'global-qwen',
      name: '通义千问 (全局)',
      apiKey: 'sk-b190ba2a13324d968814cfe95f19ca5a',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen3-omni-flash-2025-12-01',
      isGlobal: true,
      isActive: true,
    },
  });

  console.log('Created global AI provider:', globalProvider);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
