import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  ANALYSIS_PROMPT_TEMPLATE = 'ANALYSIS_PROMPT_TEMPLATE',
  STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE = 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE',
  JSON_GENERATION_PROMPT_TEMPLATE = 'JSON_GENERATION_PROMPT_TEMPLATE',
}

export enum UserSettingKey {
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  GRADING_PROMPT_TEMPLATE = 'GRADING_PROMPT_TEMPLATE',
  ANALYSIS_PROMPT_TEMPLATE = 'ANALYSIS_PROMPT_TEMPLATE',
  STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE = 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE',
  JSON_GENERATION_PROMPT_TEMPLATE = 'JSON_GENERATION_PROMPT_TEMPLATE',
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
  customAiProviderId?: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
  gradingPromptTemplate: string;
  analysisPromptTemplate: string;
  studentAiAnalysisPromptTemplate: string;
  jsonGenerationPromptTemplate: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    const settings = await this.prisma.systemSetting.findMany();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const provider = (settingsMap.get(SettingKey.AI_PROVIDER) || AIProvider.OPENAI) as AIProvider;

    // Check if it's a custom provider (UUID format)
    // Note: 'global-qwen' is a seed ID, which looks like a slug but is stored in the ID field
    if (
      provider !== AIProvider.OPENAI &&
      provider !== AIProvider.QWEN &&
      provider !== AIProvider.CUSTOM
    ) {
      // It's a specific provider ID (UUID or slug like 'global-qwen'), get from ai_providers table
      const customProvider = await this.prisma.aIProvider.findUnique({
        where: { id: provider, isActive: true },
      });

      if (customProvider) {
        return {
          aiProvider: provider,
          customAiProviderId: customProvider.id,
          aiApiKey: customProvider.apiKey,
          aiBaseUrl: customProvider.baseUrl || '',
          aiModel: customProvider.model,
          promptTemplate:
            (settingsMap.get(SettingKey.PROMPT_TEMPLATE) as string) ||
            this.getDefaultPromptTemplate(),
          gradingPromptTemplate:
            (settingsMap.get(SettingKey.GRADING_PROMPT_TEMPLATE) as string) ||
            this.getDefaultGradingPromptTemplate(),
          analysisPromptTemplate:
            (settingsMap.get(SettingKey.ANALYSIS_PROMPT_TEMPLATE) as string) ||
            this.getDefaultAnalysisPromptTemplate(),
          studentAiAnalysisPromptTemplate:
            (settingsMap.get(SettingKey.STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE) as string) ||
            this.getDefaultStudentAiAnalysisPromptTemplate(),
          jsonGenerationPromptTemplate:
            (settingsMap.get(SettingKey.JSON_GENERATION_PROMPT_TEMPLATE) as string) ||
            this.getDefaultJsonGenerationPromptTemplate(),
        };
      }
    }

    // Fallback to system settings for built-in providers
    const modelConfig = AI_MODELS.find((m) => m.provider === provider);

    return {
      aiProvider: provider,
      aiApiKey: (settingsMap.get(SettingKey.AI_API_KEY) as string) || '',
      aiBaseUrl:
        (settingsMap.get(SettingKey.AI_BASE_URL) as string) || modelConfig?.defaultBaseUrl || '',
      aiModel: (settingsMap.get(SettingKey.AI_MODEL) as string) || modelConfig?.defaultModel || '',
      promptTemplate:
        (settingsMap.get(SettingKey.PROMPT_TEMPLATE) as string) || this.getDefaultPromptTemplate(),
      gradingPromptTemplate:
        (settingsMap.get(SettingKey.GRADING_PROMPT_TEMPLATE) as string) ||
        this.getDefaultGradingPromptTemplate(),
      analysisPromptTemplate:
        (settingsMap.get(SettingKey.ANALYSIS_PROMPT_TEMPLATE) as string) ||
        this.getDefaultAnalysisPromptTemplate(),
      studentAiAnalysisPromptTemplate:
        (settingsMap.get(SettingKey.STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE) as string) ||
        this.getDefaultStudentAiAnalysisPromptTemplate(),
      jsonGenerationPromptTemplate:
        (settingsMap.get(SettingKey.JSON_GENERATION_PROMPT_TEMPLATE) as string) ||
        this.getDefaultJsonGenerationPromptTemplate(),
    };
  }

  async getUserSettings(userId: string): Promise<SystemSettings> {
    const [systemSettings, userSettings] = await Promise.all([
      this.getSettings(),
      this.prisma.userSetting.findMany({ where: { userId } }),
    ]);

    const userSettingsMap = new Map(userSettings.map((s) => [s.key, s.value]));

    // Check if user has a custom AI provider setting
    const userProvider = userSettingsMap.get('AI_PROVIDER');
    if (userProvider && userProvider !== systemSettings.aiProvider) {
      // User has a different provider, get its settings
      if (
        userProvider !== AIProvider.OPENAI &&
        userProvider !== AIProvider.QWEN &&
        userProvider !== AIProvider.CUSTOM
      ) {
        // It's a specific provider ID (UUID or slug like 'global-qwen')
        const customProvider = await this.prisma.aIProvider.findUnique({
          where: { id: userProvider, isActive: true },
        });

        if (customProvider) {
          return {
            aiProvider: userProvider as string,
            customAiProviderId: customProvider.id,
            aiApiKey: customProvider.apiKey,
            aiBaseUrl: customProvider.baseUrl || '',
            aiModel: customProvider.model,
            promptTemplate:
              (userSettingsMap.get(UserSettingKey.PROMPT_TEMPLATE) as string) ||
              systemSettings.promptTemplate,
            gradingPromptTemplate:
              (userSettingsMap.get(UserSettingKey.GRADING_PROMPT_TEMPLATE) as string) ||
              systemSettings.gradingPromptTemplate,
            analysisPromptTemplate:
              (userSettingsMap.get(UserSettingKey.ANALYSIS_PROMPT_TEMPLATE) as string) ||
              systemSettings.analysisPromptTemplate,
            studentAiAnalysisPromptTemplate:
              (userSettingsMap.get(UserSettingKey.STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE) as string) ||
              systemSettings.studentAiAnalysisPromptTemplate,
            jsonGenerationPromptTemplate:
              (userSettingsMap.get(UserSettingKey.JSON_GENERATION_PROMPT_TEMPLATE) as string) ||
              systemSettings.jsonGenerationPromptTemplate,
          };
        }
      }
    }

    return {
      ...systemSettings,
      promptTemplate:
        (userSettingsMap.get(UserSettingKey.PROMPT_TEMPLATE) as string) ||
        systemSettings.promptTemplate,
      gradingPromptTemplate:
        (userSettingsMap.get(UserSettingKey.GRADING_PROMPT_TEMPLATE) as string) ||
        systemSettings.gradingPromptTemplate,
      analysisPromptTemplate:
        (userSettingsMap.get(UserSettingKey.ANALYSIS_PROMPT_TEMPLATE) as string) ||
        systemSettings.analysisPromptTemplate,
      studentAiAnalysisPromptTemplate:
        (userSettingsMap.get(UserSettingKey.STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE) as string) ||
        systemSettings.studentAiAnalysisPromptTemplate,
      jsonGenerationPromptTemplate:
        (userSettingsMap.get(UserSettingKey.JSON_GENERATION_PROMPT_TEMPLATE) as string) ||
        systemSettings.jsonGenerationPromptTemplate,
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
        where.OR = [{ isGlobal: true }, { createdBy: userId }];
      }
    } else {
      // If no user context, only show global providers
      where.isGlobal = true;
    }

    const customProviders = await this.prisma.aIProvider.findMany({
      where,
      orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
    });

    // Convert custom providers to AIModelConfig format
    const customConfigs: AIModelConfig[] = customProviders.map((provider) => ({
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
      // 返回适当的默认值而不是抛出异常
      switch (key) {
        case SettingKey.AI_PROVIDER:
          return AIProvider.OPENAI;
        case SettingKey.PROMPT_TEMPLATE:
          return this.getDefaultPromptTemplate();
        case SettingKey.GRADING_PROMPT_TEMPLATE:
          return this.getDefaultGradingPromptTemplate();
        case SettingKey.ANALYSIS_PROMPT_TEMPLATE:
          return this.getDefaultAnalysisPromptTemplate();
        case SettingKey.STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE:
          return this.getDefaultStudentAiAnalysisPromptTemplate();
        case SettingKey.JSON_GENERATION_PROMPT_TEMPLATE:
          return this.getDefaultJsonGenerationPromptTemplate();
        default:
          return '';
      }
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

  async deleteUserSetting(userId: string, key: string): Promise<void> {
    await this.prisma.userSetting
      .delete({
        where: { userId_key: { userId, key } },
      })
      .catch(() => {
        // 如果记录不存在，忽略错误
      });
  }

  async getDefaultProviderId(): Promise<string> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: SettingKey.AI_PROVIDER },
      });
      return setting?.value || 'openai';
    } catch {
      return 'openai';
    }
  }

  async getActiveAIProvider(userId: string) {
    // Get the user's AI provider setting
    const userSetting = await this.prisma.userSetting.findFirst({
      where: {
        userId: userId,
        key: 'AI_PROVIDER',
      },
    });

    const userProvider = userSetting?.value;

    // First priority: If user has a specific custom provider ID, use that
    if (
      userProvider &&
      userProvider !== AIProvider.OPENAI &&
      userProvider !== AIProvider.QWEN &&
      userProvider !== AIProvider.CUSTOM
    ) {
      const customProvider = await this.prisma.aIProvider.findUnique({
        where: { id: userProvider, isActive: true },
      });
      if (customProvider) {
        return {
          id: customProvider.id,
          name: customProvider.name,
          provider: 'custom',
          model: customProvider.model,
          baseUrl: customProvider.baseUrl,
          isGlobal: customProvider.isGlobal,
          createdAt: customProvider.createdAt,
          createdBy: customProvider.createdBy,
        };
      }
    }

    // Second priority: If user has CUSTOM provider setting, find their first active custom provider
    if (userProvider === AIProvider.CUSTOM) {
      const customProvider = await this.prisma.aIProvider.findFirst({
        where: {
          isActive: true,
          OR: [{ isGlobal: true }, { createdBy: userId }],
        },
        orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
      });

      if (customProvider) {
        return {
          id: customProvider.id,
          name: customProvider.name,
          provider: 'custom',
          model: customProvider.model,
          baseUrl: customProvider.baseUrl,
          isGlobal: customProvider.isGlobal,
          createdAt: customProvider.createdAt,
          createdBy: customProvider.createdBy,
        };
      }
    }

    // Third priority: Use system default provider
    const systemProviderValue = await this.getSetting(SettingKey.AI_PROVIDER);

    // If system default is CUSTOM, try to find a custom provider
    if (systemProviderValue === AIProvider.CUSTOM) {
      const customProvider = await this.prisma.aIProvider.findFirst({
        where: {
          isActive: true,
          OR: [{ isGlobal: true }, { createdBy: userId }],
        },
        orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
      });

      if (customProvider) {
        return {
          id: customProvider.id,
          name: customProvider.name,
          provider: 'custom',
          model: customProvider.model,
          baseUrl: customProvider.baseUrl,
          isGlobal: customProvider.isGlobal,
          createdAt: customProvider.createdAt,
          createdBy: customProvider.createdBy,
        };
      }
    }

    // Fallback: Return system provider info
    return {
      id: null,
      name: systemProviderValue || AIProvider.OPENAI,
      provider: systemProviderValue || AIProvider.OPENAI,
      model: null,
      baseUrl: null,
      isGlobal: true,
      createdAt: null,
      createdBy: null,
    };
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

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

请只返回JSON格式的题目数据，不要包含其他说明文字。`;
  }

  async getDefaultPromptTemplateByType(templateType: string): Promise<string> {
    switch (templateType) {
      case 'PROMPT_TEMPLATE':
        return this.getDefaultPromptTemplate();
      case 'GRADING_PROMPT_TEMPLATE':
        return this.getDefaultGradingPromptTemplate();
      case 'ANALYSIS_PROMPT_TEMPLATE':
        return this.getDefaultAnalysisPromptTemplate();
      case 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE':
        return this.getDefaultStudentAiAnalysisPromptTemplate();
      case 'JSON_GENERATION_PROMPT_TEMPLATE':
        return this.getDefaultJsonGenerationPromptTemplate();
      default:
        throw new BadRequestException(`Unknown template type: ${templateType}`);
    }
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

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

请返回JSON格式的评分结果：
{
  "score": 实际得分,
  "reasoning": "评分理由",
  "suggestions": "改进建议",
  "confidence": 评分置信度(0-1)
}

请只返回JSON格式的评分结果，不要包含其他说明文字。`;
  }

  private getDefaultAnalysisPromptTemplate(): string {
    return `请基于以下考试数据生成一份详细的分析报告：

考试信息：
- 考试名称：{examTitle}
- 考试描述：{examDescription}
- 考试时长：{duration}分钟
- 总分：{totalScore}分
- 题目数量：{questionCount}道

统计数据：
- 平均分：{averageScore}分
- 最高分：{highestScore}分
- 最低分：{lowestScore}分
- 及格率：{passRate}%
- 参与学生：{submittedCount}人
- 参与率：{participationRate}%

题目分析：
{questionStats}

知识点分析：
{knowledgePointStats}

请从以下几个方面进行分析：
1. 整体考试表现评价
2. 学生掌握情况分析
3. 题目难度和区分度分析
4. 知识点掌握情况分析
5. 教学建议和改进方向

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

请用中文回答，内容要专业、详细、有针对性。`;
  }

  private getDefaultStudentAiAnalysisPromptTemplate(): string {
    return `你是一名严格但建设性的阅卷专家与学习教练。

请基于下列"该学生的评分详情数据"，生成一份该学生的个人学习诊断报告。

要求：
- 用中文回答
- 重点分析扣分原因、常见错误类型、薄弱知识点、作答策略问题
- 给出可执行的改进建议（短期1周/中期1月）
- 如果评分详情不足以判断，请明确说明缺失信息并提出你需要的补充字段

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

输出格式（Markdown）：
- 总体表现概述
- 主要失分原因（按重要性排序）
- 薄弱知识点与专项建议
- 作答策略与时间分配建议
- 1周提升计划
- 1月提升计划

【学生信息】
{studentLabel}

【该学生的个性化分析提示词】
{studentPrompt}

【评分详情数据(JSON)】
{payload}`;
  }

  private getDefaultJsonGenerationPromptTemplate(): string {
    return `你是一个专业的题目生成AI助手。
根据用户提供的试卷图像或文本，生成一次线上考试的JSON格式数据。

要求：
1. 根据输入识别所有题目
2. 确保题目格式正确，包括题干、选项（选择题）、答案、解析
3. 为每道题提供合理的难度（1-5）、知识点和标签
4. 输出严格的JSON格式，格式要求：
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

数学公式表示：
- 行内公式：使用 $...$ 或 \\( ... \\) 包围
- 块级公式：使用 $$...$$ 或 \\[ ... \\] 包围

请只返回JSON格式的题目数据，不要包含其他说明文字。`;
  }
}
