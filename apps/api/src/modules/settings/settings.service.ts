import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum AIProvider {
  OPENAI = 'openai',
  QWEN = 'qwen',
  CUSTOM = 'custom',
}

export enum SettingKey {
  AI_PROVIDER = 'AI_PROVIDER',
  AI_API_KEY = 'AI_API_KEY',
  AI_BASE_URL = 'AI_BASE_URL',
  AI_MODEL = 'AI_MODEL',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  GRADING_PROMPT_TEMPLATE = 'GRADING_PROMPT_TEMPLATE',
}

export enum UserSettingKey {
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  GRADING_PROMPT_TEMPLATE = 'GRADING_PROMPT_TEMPLATE',
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  defaultBaseUrl?: string;
  defaultModel?: string;
}

export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: AIProvider.OPENAI,
    defaultBaseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: AIProvider.OPENAI,
    defaultBaseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-3.5-turbo',
  },
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: AIProvider.QWEN,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-turbo',
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: AIProvider.QWEN,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
  },
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    provider: AIProvider.QWEN,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-max',
  },
];

export interface SystemSettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
  gradingPromptTemplate: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    const settings = await this.prisma.systemSetting.findMany();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const provider = (settingsMap.get(SettingKey.AI_PROVIDER) || AIProvider.OPENAI) as AIProvider;
    
    // Check if it's a custom provider (UUID format)
    if (provider !== AIProvider.OPENAI && provider !== AIProvider.QWEN && provider !== AIProvider.CUSTOM) {
      // It's a custom provider ID, get from ai_providers table
      const customProvider = await this.prisma.aIProvider.findUnique({
        where: { id: provider, isActive: true },
      });
      
      if (customProvider) {
        return {
          aiProvider: provider,
          aiApiKey: customProvider.apiKey,
          aiBaseUrl: customProvider.baseUrl || '',
          aiModel: customProvider.model,
          promptTemplate: settingsMap.get(SettingKey.PROMPT_TEMPLATE) || this.getDefaultPromptTemplate(),
          gradingPromptTemplate: settingsMap.get(SettingKey.GRADING_PROMPT_TEMPLATE) || this.getDefaultGradingPromptTemplate(),
        };
      }
    }

    // Fallback to system settings for built-in providers
    const modelConfig = AI_MODELS.find((m) => m.provider === provider);

    return {
      aiProvider: provider,
      aiApiKey: settingsMap.get(SettingKey.AI_API_KEY) || '',
      aiBaseUrl: settingsMap.get(SettingKey.AI_BASE_URL) || modelConfig?.defaultBaseUrl || '',
      aiModel: settingsMap.get(SettingKey.AI_MODEL) || modelConfig?.defaultModel || '',
      promptTemplate:
        settingsMap.get(SettingKey.PROMPT_TEMPLATE) || this.getDefaultPromptTemplate(),
      gradingPromptTemplate:
        settingsMap.get(SettingKey.GRADING_PROMPT_TEMPLATE) || this.getDefaultGradingPromptTemplate(),
    };
  }

  async getUserSettings(userId: string): Promise<SystemSettings> {
    const [systemSettings, userSettings] = await Promise.all([
      this.getSettings(),
      this.prisma.userSetting.findMany({ where: { userId } })
    ]);

    const userSettingsMap = new Map(userSettings.map((s) => [s.key, s.value]));

    // Check if user has a custom AI provider setting
    const userProvider = userSettingsMap.get('AI_PROVIDER');
    if (userProvider && userProvider !== systemSettings.aiProvider) {
      // User has a different provider, get its settings
      if (userProvider !== AIProvider.OPENAI && userProvider !== AIProvider.QWEN && userProvider !== AIProvider.CUSTOM) {
        const customProvider = await this.prisma.aIProvider.findUnique({
          where: { id: userProvider, isActive: true },
        });
        
        if (customProvider) {
          return {
            aiProvider: userProvider,
            aiApiKey: customProvider.apiKey,
            aiBaseUrl: customProvider.baseUrl || '',
            aiModel: customProvider.model,
            promptTemplate: userSettingsMap.get(UserSettingKey.PROMPT_TEMPLATE) || systemSettings.promptTemplate,
            gradingPromptTemplate: userSettingsMap.get(UserSettingKey.GRADING_PROMPT_TEMPLATE) || systemSettings.gradingPromptTemplate,
          };
        }
      }
    }

    return {
      ...systemSettings,
      promptTemplate: userSettingsMap.get(UserSettingKey.PROMPT_TEMPLATE) || systemSettings.promptTemplate,
      gradingPromptTemplate: userSettingsMap.get(UserSettingKey.GRADING_PROMPT_TEMPLATE) || systemSettings.gradingPromptTemplate,
    };
  }

  async getAvailableProviders(userId?: string, userRole?: string): Promise<AIModelConfig[]> {
    // Get custom providers from database
    const where: any = { isActive: true };
    
    if (userId && userRole) {
      if (userRole === 'ADMIN') {
        // Admin can see all providers
      } else {
        // Teachers can see global providers and their own
        where.OR = [
          { isGlobal: true },
          { createdBy: userId },
        ];
      }
    } else {
      // If no user context, only show global providers
      where.isGlobal = true;
    }

    const customProviders = await this.prisma.aIProvider.findMany({
      where,
      orderBy: [
        { isGlobal: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Convert custom providers to AIModelConfig format
    const customConfigs: AIModelConfig[] = customProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      provider: 'custom' as any,
      defaultBaseUrl: provider.baseUrl || undefined,
      defaultModel: provider.model,
    }));

    return [...AI_MODELS, ...customConfigs];
  }

  async getSetting(key: string): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting ${key} not found`);
    }

    return setting.value;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
  }

  async updateUserSetting(userId: string, key: string, value: string): Promise<void> {
    await this.prisma.userSetting.upsert({
      where: { userId_key: { userId, key } },
      update: { value, updatedAt: new Date() },
      create: { userId, key, value },
    });
  }

  async getPromptTemplate(): Promise<string> {
    const template = await this.getSetting(SettingKey.PROMPT_TEMPLATE);
    return template || this.getDefaultPromptTemplate();
  }

  getDefaultPromptTemplate(): string {
    return `你是一个专业的题目生成AI助手。
根据用户提供的试卷图像和约束条件，生成一次线上考试。

要求：
1. 根据试卷图像识别所有题目
2. 确保题目格式正确，包括题干、选项（选择题）、答案、解析
3. 为每道题提供合理的难度（1-5）、知识点和标签
4. 输出JSON格式，格式要求：
{
  "questions": [
    {
      "content": "题干内容",
      "type": "题型(SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK/ESSAY)",
      "options": [{"label": "A", "content": "选项1"}, ...],
      "answer": "正确答案",
      "explanation": "题目解析",
      "difficulty": 1,
      "tags": ["标签1", "标签2"],
      "knowledgePoint": "知识点"
    }
  ]
}

请只返回JSON格式的题目数据，不要包含其他说明文字。`;
  }

  getJsonStructureTemplate(): string {
    return `{
  "questions": [
    {
      "content": "题干内容",
      "type": "题型(SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK/ESSAY)",
      "options": [{"label": "A", "content": "选项1"}, {"label": "B", "content": "选项2"}],
      "answer": "正确答案",
      "explanation": "题目解析",
      "difficulty": 1,
      "tags": ["标签1", "标签2"],
      "knowledgePoint": "知识点"
    }
  ]
}`;
  }

  private getDefaultGradingPromptTemplate(): string {
    return `你是一个专业的考试评分AI助手。请根据以下信息对学生答案进行评分：

题目内容：{questionContent}
题目类型：{questionType}
参考答案：{referenceAnswer}
学生答案：{studentAnswer}
满分：{maxScore}

评分标准：
1. 内容准确性（40%）：答案是否准确回答了题目要求
2. 完整性（30%）：答案是否涵盖了关键要点
3. 逻辑性（20%）：答案是否条理清晰、逻辑合理
4. 表达质量（10%）：语言表达是否规范、清晰

请返回JSON格式的评分结果：
{
  "score": 实际得分,
  "reasoning": "评分理由",
  "suggestions": "改进建议",
  "confidence": 评分置信度(0-1)
}

请只返回JSON格式的评分结果，不要包含其他说明文字。`;
  }
}
