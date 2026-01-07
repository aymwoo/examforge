import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum SettingKey {
  AI_PROVIDER = 'AI_PROVIDER',
  AI_API_KEY = 'AI_API_KEY',
  AI_BASE_URL = 'AI_BASE_URL',
  AI_MODEL = 'AI_MODEL',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
}

export interface SystemSettings {
  aiProvider: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  promptTemplate: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    const settings = await this.prisma.systemSetting.findMany();
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    return {
      aiProvider: settingsMap.get(SettingKey.AI_PROVIDER) || 'openai',
      aiApiKey: settingsMap.get(SettingKey.AI_API_KEY) || '',
      aiBaseUrl: settingsMap.get(SettingKey.AI_BASE_URL) || '',
      aiModel: settingsMap.get(SettingKey.AI_MODEL) || 'gpt-4',
      promptTemplate:
        settingsMap.get(SettingKey.PROMPT_TEMPLATE) || this.getDefaultPromptTemplate(),
    };
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

  async getPromptTemplate(): Promise<string> {
    return this.getSetting(SettingKey.PROMPT_TEMPLATE);
  }

  private getDefaultPromptTemplate(): string {
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
}
