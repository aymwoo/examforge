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

  private buildApiUrl(baseUrl: string): string {
    const defaultUrl = 'https://api.openai.com/v1/chat/completions';
    const url = baseUrl || defaultUrl;
    return url.endsWith('/chat/completions') ? url : `${url}/chat/completions`;
  }

  async generateQuestionsFromText(
    text: string,
    opts?: { chunkIndex?: number; totalChunks?: number }
  ): Promise<GenerateExamQuestionsResponse> {
    const settings = await this.settingsService.getSettings();
    const promptTemplate = await this.settingsService.getPromptTemplate();

    if (!settings.aiApiKey) {
      throw new BadRequestException(
        'AI API Key not configured. Please configure AI provider in settings.'
      );
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new BadRequestException('No text found for AI generation');
    }

    try {
      const apiUrl = this.buildApiUrl(settings.aiBaseUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-4',
          messages: [
            { role: 'system', content: `${promptTemplate}` },
            {
              role: 'user',
              content:
                opts?.chunkIndex && opts?.totalChunks
                  ? `以下是从 PDF 解析得到的试题文本（分块 ${opts.chunkIndex}/${opts.totalChunks}）。

要求：
- 逐题输出：不要遗漏当前分块中出现的任何题目（包含选择题/判断题/填空题/简答题/实践应用题）。
- 不要合并题目；每道题都要单独作为一个 question。
- 如果题目/答案跨行或被打散，请尽量还原。
- 只返回严格 JSON：{"questions":[...]}（不要输出 markdown 或说明）。`
                  : `以下是从 PDF 解析得到的试题文本。

要求：
- 逐题输出：不要遗漏文本中出现的任何题目（包含选择题/判断题/填空题/简答题/实践应用题）。
- 不要合并题目；每道题都要单独作为一个 question。
- 如果题目/答案跨行或被打散，请尽量还原。
- 只返回严格 JSON：{"questions":[...]}（不要输出 markdown 或说明）。`,
            },
            {
              role: 'user',
              content: trimmedText,
            },
          ],
          max_tokens: 8000,
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

  async generateExamQuestions(imageBuffer: Buffer): Promise<GenerateExamQuestionsResponse> {
    const settings = await this.settingsService.getSettings();
    const promptTemplate = await this.settingsService.getPromptTemplate();

    if (!settings.aiApiKey) {
      throw new BadRequestException(
        'AI API Key not configured. Please configure AI provider in settings.'
      );
    }

    try {
      const apiUrl = this.buildApiUrl(settings.aiBaseUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.aiApiKey}`,
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

  async testConnection(message: string = 'Hello'): Promise<{ response: string }> {
    const settings = await this.settingsService.getSettings();

    if (!settings.aiApiKey) {
      throw new BadRequestException(
        'AI API Key not configured. Please configure AI provider in settings.'
      );
    }

    const apiUrl = this.buildApiUrl(settings.aiBaseUrl);

    console.log(`AI Test Connection URL: ${apiUrl}`);
    console.log(`AI Model: ${settings.aiModel || 'gpt-4'}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-4',
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API Error: ${response.status} - ${errorText}`);
        throw new BadRequestException(`AI API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadRequestException('AI returned empty response');
      }

      return { response: content };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('AI connection test error:', error);
      throw new BadRequestException(
        'Failed to connect to AI. Please check your API key and settings.'
      );
    }
  }

  async generateExamQuestionsFromImage(
    imageBase64: string
  ): Promise<GenerateExamQuestionsResponse> {
    const settings = await this.settingsService.getSettings();
    const promptTemplate = await this.settingsService.getPromptTemplate();

    if (!settings.aiApiKey) {
      throw new BadRequestException(
        'AI API Key not configured. Please configure AI provider in settings.'
      );
    }

    try {
      const apiUrl = this.buildApiUrl(settings.aiBaseUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `${promptTemplate}`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `以下是试卷图片，请识别并逐题输出（不要遗漏任何题目）。

要求：
1. 不要合并题目；每道题都要单独作为一个 question。
2. 如题目/答案跨行或被打散，请尽量还原完整内容。
3. type 字段必须是以下之一：SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, FILL_BLANK, ESSAY
4. 选择题必须包含 options 数组，格式 [{"label":"A","content":"..."},...]
5. answer 字段：选择题填选项字母（如 "A" 或 "AB"），判断题填 "正确"/"错误" 或 "对"/"错"，其他题型填完整答案。
6. 只返回严格 JSON：{"questions":[...]}（不要输出 markdown、代码块或任何说明文字）。`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 8000,
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

  /**
   * Extract first balanced JSON object or array from text.
   */
  private extractFirstJson(text: string): { type: 'object' | 'array'; json: string } | null {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');

    // Determine which comes first
    let start = -1;
    let openChar = '{';
    let closeChar = '}';

    if (objStart === -1 && arrStart === -1) {
      return null;
    } else if (objStart === -1) {
      start = arrStart;
      openChar = '[';
      closeChar = ']';
    } else if (arrStart === -1) {
      start = objStart;
    } else if (arrStart < objStart) {
      start = arrStart;
      openChar = '[';
      closeChar = ']';
    } else {
      start = objStart;
    }

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\') {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === openChar) depth++;
      if (ch === closeChar) depth--;

      if (depth === 0) {
        return {
          type: openChar === '{' ? 'object' : 'array',
          json: cleaned.slice(start, i + 1),
        };
      }
    }

    // Unbalanced, return what we have
    return {
      type: openChar === '{' ? 'object' : 'array',
      json: cleaned.slice(start),
    };
  }

  private parseAIResponse(content: string): AIQuestion[] {
    // Log raw content for debugging (first 500 chars)
    console.log('[AI Response] Raw content preview:', content.slice(0, 500));

    try {
      const extracted = this.extractFirstJson(content);

      if (!extracted) {
        // Check if this is a "no questions" response
        const lowerContent = content.toLowerCase();
        if (
          lowerContent.includes('没有题目') ||
          lowerContent.includes('无法识别') ||
          lowerContent.includes('no question') ||
          lowerContent.includes('空白') ||
          lowerContent.includes('封面') ||
          lowerContent.includes('答案')
        ) {
          console.log('[AI Response] Page appears to have no questions, returning empty array');
          return [];
        }
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(extracted.json);

      // Case 1: {"questions": [...]}
      if (parsed.questions && Array.isArray(parsed.questions)) {
        console.log(`[AI Response] Parsed ${parsed.questions.length} questions from object`);
        return parsed.questions;
      }

      // Case 2: Direct array [...]
      if (Array.isArray(parsed)) {
        console.log(`[AI Response] Parsed ${parsed.length} questions from array`);
        return parsed;
      }

      // Case 3: Single question object
      if (parsed.content && parsed.type) {
        console.log('[AI Response] Parsed single question object');
        return [parsed];
      }

      // Case 4: Empty object or other structure
      if (typeof parsed === 'object' && Object.keys(parsed).length === 0) {
        console.log('[AI Response] Empty object, returning empty array');
        return [];
      }

      throw new Error('Unexpected JSON structure');
    } catch (error: unknown) {
      console.error('[AI Response] Parse error:', (error as Error).message);
      console.error('[AI Response] Full content:', content);

      // Last resort: check for "no questions" indicators
      const lowerContent = content.toLowerCase();
      if (
        lowerContent.includes('没有题目') ||
        lowerContent.includes('无法识别') ||
        lowerContent.includes('无题目') ||
        lowerContent.includes('空白页') ||
        lowerContent.includes('封面') ||
        lowerContent.includes('目录')
      ) {
        console.log('[AI Response] Detected no-question page from error path');
        return [];
      }

      throw new BadRequestException(
        `AI returned invalid format. Expected: { "questions": [...] }. Got: ${content.slice(0, 200)}`
      );
    }
  }
}
