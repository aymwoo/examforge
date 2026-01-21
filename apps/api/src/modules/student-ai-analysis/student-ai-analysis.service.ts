import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';

@Injectable()
export class StudentAiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService
  ) {}

  async getBySubmission(submissionId: string, currentUser: any) {
    const report = await this.prisma.studentAiAnalysisReport.findUnique({
      where: { submissionId },
    });

    if (!report) {
      return null;
    }

    await this.assertCanAccessExam(report.examId, currentUser);
    return report;
  }

  async getByExamStudent(examId: string, examStudentId: string, currentUser: any) {
    await this.assertCanAccessExam(examId, currentUser);

    const report = await this.prisma.studentAiAnalysisReport.findFirst({
      where: {
        examId,
        examStudentId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return report || null;
  }

  async generateStream(options: {
    examId: string;
    submissionId: string;
    force: boolean;
    user: any;
    res: Response;
  }) {
    const { examId, submissionId, force, user, res } = options;

    if (!examId || !submissionId) {
      throw new BadRequestException('examId/submissionId are required');
    }

    await this.assertCanAccessExam(examId, user);

    const existing = await this.prisma.studentAiAnalysisReport.findUnique({
      where: { submissionId },
    });

    if (existing && !force && existing.status === 'COMPLETED' && existing.report) {
      this.sse(res, { type: 'complete', report: existing.report });
      res.end();
      return;
    }

    this.sse(res, { type: 'start', message: '开始生成学生AI分析报告...' });

    this.sse(res, { type: 'progress', message: '正在获取答卷与评分详情...', progress: 5 });

    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: true,
        examStudent: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!submission || submission.examId !== examId) {
      this.sse(res, { type: 'error', message: '答卷不存在或考试不匹配' });
      res.end();
      return;
    }

    const gradingDetails = this.safeJsonParse(submission.gradingDetails);

    const settings = await this.settingsService.getUserSettings(user?.sub || user?.id);

    const aiProvider =
      settings.aiProvider === 'CUSTOM'
        ? await this.prisma.aIProvider.findUnique({ where: { id: settings.customAiProviderId } })
        : await this.prisma.aIProvider.findFirst({
            where: {
              isActive: true,
              OR: [{ isGlobal: true }, { createdBy: user?.sub || user?.id }],
            },
            orderBy: [{ isGlobal: 'asc' }, { createdAt: 'desc' }],
          });

    if (!aiProvider) {
      this.sse(res, {
        type: 'error',
        message: '未找到可用的AI Provider，请先在设置页面配置AI服务',
      });
      res.end();
      return;
    }

    const studentPrompt = (submission.examStudent?.student as any)?.aiAnalysisPrompt || '';
    const teacherId = user?.sub || user?.id;
    const teacherSettings = teacherId
      ? await this.settingsService.getUserSettings(teacherId)
      : null;

    this.sse(res, { type: 'progress', message: '正在构建分析提示词...', progress: 15 });

    const prompt = this.buildStudentAnalysisPrompt({
      template: teacherSettings?.studentAiAnalysisPromptTemplate,
      exam: submission.exam,
      submission: {
        id: submission.id,
        score: submission.score,
        answers: this.safeJsonParse(submission.answers),
        gradingDetails,
      },
      examStudent: submission.examStudent,
      studentPrompt,
    });

    const now = new Date();

    // Ensure there is a report record to update during streaming
    await this.prisma.studentAiAnalysisReport.upsert({
      where: { submissionId },
      create: {
        submissionId,
        examId: submission.examId,
        examStudentId: submission.examStudentId,
        studentId: submission.examStudent?.student?.id || null,
        status: 'GENERATING',
        progress: 15,
        providerId: aiProvider.id,
        model: aiProvider.model,
        promptUsed: prompt,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        examId: submission.examId,
        examStudentId: submission.examStudentId,
        studentId: submission.examStudent?.student?.id || null,
        status: 'GENERATING',
        progress: 15,
        providerId: aiProvider.id,
        model: aiProvider.model,
        promptUsed: prompt,
        errorMessage: null,
        report: null,
        updatedAt: now,
      },
    });

    this.sse(res, { type: 'progress', message: '正在调用AI服务生成报告...', progress: 25 });

    try {
      const report = await this.callAIServiceStream(aiProvider, prompt, res, async (p) => {
        await this.prisma.studentAiAnalysisReport.update({
          where: { submissionId },
          data: { progress: p, updatedAt: new Date() },
        });
      });

      await this.prisma.studentAiAnalysisReport.update({
        where: { submissionId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          report,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

      this.sse(res, { type: 'complete', report });
      res.end();
    } catch (error: any) {
      await this.prisma.studentAiAnalysisReport.update({
        where: { submissionId },
        data: {
          status: 'FAILED',
          progress: 100,
          errorMessage: error?.message || '生成失败',
          updatedAt: new Date(),
        },
      });

      this.sse(res, {
        type: 'error',
        message: `生成学生AI分析报告失败: ${error?.message || 'unknown error'}`,
      });
      res.end();
    }
  }

  private async assertCanAccessExam(examId: string, currentUser: any) {
    if (!currentUser) {
      throw new ForbiddenException('Unauthorized');
    }

    if (currentUser.role === 'ADMIN') {
      return;
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, createdBy: true },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    if (currentUser.role === 'TEACHER') {
      const teacherId = currentUser.sub || currentUser.id;
      if (exam.createdBy !== teacherId) {
        throw new ForbiddenException('无权访问该考试');
      }
      return;
    }

    throw new ForbiddenException('无权访问');
  }

  private buildStudentAnalysisPrompt(input: {
    template?: string | null;
    exam: any;
    submission: {
      id: string;
      score: number | null;
      answers: any;
      gradingDetails: any;
    };
    examStudent: any;
    studentPrompt: string;
  }) {
    const examTitle = input.exam?.title || '';
    const examDescription = input.exam?.description || '';
    const totalScore = input.exam?.totalScore || 0;

    const accountLabel = input.examStudent?.displayName || input.examStudent?.username || '';

    const payload = {
      exam: {
        id: input.exam?.id,
        title: examTitle,
        description: examDescription,
        totalScore,
      },
      student: {
        examStudentId: input.examStudent?.id,
        username: input.examStudent?.username,
        displayName: input.examStudent?.displayName,
      },
      submission: {
        id: input.submission.id,
        score: input.submission.score,
        gradingDetails: input.submission.gradingDetails,
      },
    };

    const template = input.template || '';

    // Keep backward compatibility: if template is blank, fall back to the old hardcoded prompt.
    const fallbackPrompt = `你是一名严格但建设性的阅卷专家与学习教练。

请基于下列“该学生的评分详情数据”，生成一份该学生的个人学习诊断报告。

要求：
- 用中文回答
- 重点分析扣分原因、常见错误类型、薄弱知识点、作答策略问题
- 给出可执行的改进建议（短期1周/中期1月）
- 如果评分详情不足以判断，请明确说明缺失信息并提出你需要的补充字段

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

    const finalTemplate = template.trim() ? template : fallbackPrompt;

    return finalTemplate
      .replaceAll('{studentLabel}', accountLabel)
      .replaceAll('{studentPrompt}', input.studentPrompt || '')
      .replaceAll('{payload}', JSON.stringify(payload, null, 2));
  }

  private safeJsonParse(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private async callAIServiceStream(
    aiProvider: any,
    prompt: string,
    res: Response,
    onProgress?: (progress: number) => Promise<void>
  ): Promise<string> {
    const apiKey = aiProvider.apiKey;
    const baseUrl = aiProvider.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = aiProvider.model || 'qwen-turbo';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI服务调用失败: ${response.status} ${response.statusText} ${errorText}`);
    }

    let fullReport = '';
    let lastProgress = 25;

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('AI服务未返回可读流');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullReport += content;
            this.sse(res, { type: 'stream', content });

            // Best-effort progress based on output size.
            if (fullReport.length > 0) {
              const estimated = Math.min(95, 25 + Math.floor(fullReport.length / 120));
              if (estimated > lastProgress) {
                lastProgress = estimated;
                this.sse(res, { type: 'progress', message: '生成中...', progress: lastProgress });
                if (onProgress) {
                  await onProgress(lastProgress);
                }
              }
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    return fullReport || '生成报告失败';
  }

  private sse(res: Response, data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
