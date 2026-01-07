import { Injectable, BadRequestException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

export interface AIQuestion {
  content: string;
  type: string;
  options?: Array<{ label: string; content: string }>;
  answer: string;
  explanation?: string;
  difficulty: number;
  tags: string[];
  knowledgePoint?: string;
}

export interface GenerateExamQuestionsResponse {
  questions: AIQuestion[];
}

@Injectable()
export class AIService {
  constructor(private readonly settingsService: SettingsService) {}

  async generateExamQuestions(imageBuffer: Buffer): Promise<GenerateExamQuestionsResponse> {
    const settings = await this.settingsService.getSettings();
    const promptTemplate = await this.settingsService.getPromptTemplate();

    if (!settings.aiApiKey) {
      throw new BadRequestException('AI API Key not configured. Please configure AI provider in settings.');
    }

    try {
      const response = await fetch(settings.aiBaseUrl || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `${promptTemplate}`,
            },
            {
              role: 'user',
              content: '这是上传的试卷图像，请根据要求生成题目。',
            },
          ],
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadRequestException(`AI API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadRequestException('AI returned empty response');
      }

      const questions = this.parseAIResponse(content);

      return { questions };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('AI generation error:', error);
      throw new BadRequestException('Failed to generate questions from AI. Please try again.');
    }
  }

  async generateExamQuestionsFromImage(imageBase64: string): Promise<GenerateExamQuestionsResponse> {
    const settings = await this.settingsService.getSettings();
    const promptTemplate = await this.settingsService.getPromptTemplate();

    if (!settings.aiApiKey) {
      throw new BadRequestException('AI API Key not configured. Please configure AI provider in settings.');
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    try {
      const response = await fetch(settings.aiBaseUrl || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: settings.promptTemplate,
            },
            {
              role: 'user',
              content: '请分析上传的试卷图像并生成符合指定JSON格式的考试题目。只返回JSON格式的题目数据，不要有任何其他说明。',
            },
            {
              role: 'user',
              type: 'image_url',
              image_url: `data:image/jpeg;base64,${imageBase64}`,
            },
          ],
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new BadRequestException(`AI API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadRequestException('AI returned empty response');
      }

      const questions = this.parseAIResponse(content);

      return { questions };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('AI generation error:', error);
      throw new BadRequestException('Failed to generate questions from AI. Please try again.');
    }
  }

  private parseAIResponse(content: string): AIQuestion[] {
    try {
      const cleanedContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedContent);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid AI response format');
      }

      return parsed.questions;
    } catch (error: unknown) {
      console.error('Failed to parse AI response:', error);
      throw new BadRequestException('AI returned invalid format. Expected: { "questions": [...] }');
    }
  }
}
