import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { AIService } from '../ai/ai.service';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AccountGenerator } from '../../common/utils/account-generator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        totalScore: dto.totalScore || 100,
        accountModes: JSON.stringify(dto.accountModes || ['TEMPORARY_IMPORT']),
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        status: 'DRAFT',
      },
    });
  }

  async getDashboardStats(userId?: string, userRole?: string) {
    // Base query conditions - show all published exams, not just ongoing
    const baseWhere: any = {
      status: 'PUBLISHED',
    };

    // If authenticated and not admin, only show user's exams
    if (userId && userRole && userRole !== 'ADMIN') {
      baseWhere.createdBy = userId;
    }

    // Get total questions count
    const totalQuestions = await this.prisma.question.count();

    // Get published exams with submission counts
    const publishedExams = await this.prisma.exam.findMany({
      where: baseWhere,
      include: {
        submissions: {
          select: {
            id: true,
          },
        },
        examStudents: {
          select: {
            id: true,
          },
        },
      },
    });

    // Filter for ongoing exams (for the ongoing count)
    const now = new Date();
    const ongoingExams = publishedExams.filter(exam => {
      // If no start/end time set, consider it as ongoing
      if (!exam.startTime || !exam.endTime) return true;
      return now >= exam.startTime && now <= exam.endTime;
    });

    // Calculate statistics
    const stats = {
      ongoingExams: ongoingExams.length,
      totalStudents: publishedExams.reduce((sum, exam) => sum + exam.examStudents.length, 0),
      totalSubmissions: publishedExams.reduce((sum, exam) => sum + exam.submissions.length, 0),
      totalQuestions: totalQuestions,
      exams: ongoingExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        startTime: exam.startTime,
        endTime: exam.endTime,
        duration: exam.duration,
        totalScore: exam.totalScore,
        status: exam.status,
        submissionCount: exam.submissions.length,
        totalStudents: exam.examStudents.length,
      })),
    };

    return stats;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 20, status } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          examQuestions: {
            include: {
              question: true,
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { 
              submissions: true,
              examStudents: true,
            },
          },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data: data.map((exam) => this.transformExam(exam)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { 
            submissions: true,
            examStudents: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam #${id} not found`);
    }

    return this.transformExam(exam);
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findById(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.totalScore !== undefined) updateData.totalScore = dto.totalScore;
    if (dto.accountModes !== undefined) updateData.accountModes = JSON.stringify(dto.accountModes);
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.exam.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.exam.delete({ where: { id } });
  }

  async addQuestion(examId: string, dto: AddQuestionDto) {
    await this.findById(examId);

    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question #${dto.questionId} not found`);
    }

    const existing = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId: dto.questionId,
      },
    });

    if (existing) {
      throw new BadRequestException('Question already added to this exam');
    }

    return this.prisma.examQuestion.create({
      data: {
        examId,
        questionId: dto.questionId,
        order: dto.order,
        score: dto.score || 1,
      },
    });
  }

  async removeQuestion(examId: string, questionId: string) {
    await this.findById(examId);

    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in this exam');
    }

    await this.prisma.examQuestion.delete({
      where: { id: examQuestion.id },
    });
  }

  async updateQuestionOrder(examId: string, questionId: string, order: number, score?: number) {
    await this.findById(examId);

    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in this exam');
    }

    return this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: {
        order,
        ...(score !== undefined && { score }),
      },
    });
  }

  private transformExam(exam: any) {
    return {
      ...exam,
      accountModes: exam.accountModes ? JSON.parse(exam.accountModes) : ['TEMPORARY_IMPORT'],
      examQuestions: exam.examQuestions.map((eq: any) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        order: eq.order,
        score: eq.score,
        question: eq.question,
      })),
      submissionCount: exam._count.submissions,
      totalStudents: exam._count.examStudents,
      _count: undefined,
    };
  }

  // 学生管理功能
  async addStudent(examId: string, dto: CreateExamStudentDto) {
    await this.findById(examId);

    // 检查用户名是否已存在
    const existing = await this.prisma.examStudent.findFirst({
      where: {
        examId,
        username: dto.username,
      },
    });

    if (existing) {
      throw new ConflictException('Username already exists in this exam');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.examStudent.create({
      data: {
        examId,
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName,
      },
    });
  }

  async batchAddStudents(examId: string, dto: BatchCreateExamStudentsDto) {
    await this.findById(examId);

    const results = [];
    const errors = [];

    for (const student of dto.students) {
      try {
        const result = await this.addStudent(examId, student);
        results.push(result);
      } catch (error) {
        errors.push({
          username: student.username,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async getExamStudents(examId: string) {
    await this.findById(examId);

    return this.prisma.examStudent.findMany({
      where: { examId },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateExamStudent(examId: string, studentId: string, dto: Partial<CreateExamStudentDto>) {
    await this.findById(examId);

    const student = await this.prisma.examStudent.findFirst({
      where: { id: studentId, examId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this exam');
    }

    const updateData: any = {};
    if (dto.username) updateData.username = dto.username;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.examStudent.update({
      where: { id: studentId },
      data: updateData,
    });
  }

  async deleteExamStudent(examId: string, studentId: string) {
    await this.findById(examId);

    const student = await this.prisma.examStudent.findFirst({
      where: { id: studentId, examId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this exam');
    }

    await this.prisma.examStudent.delete({
      where: { id: studentId },
    });
  }

  // 考试进行相关方法
  async getExamForTaking(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    // 检查考试状态
    if (exam.status !== 'PUBLISHED') {
      throw new BadRequestException('考试未发布');
    }

    // 检查考试时间
    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      throw new BadRequestException('考试尚未开始');
    }
    if (exam.endTime && now > exam.endTime) {
      throw new BadRequestException('考试已结束');
    }

    // 返回考试信息和题目
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalScore: exam.totalScore,
      questions: exam.examQuestions.map(eq => {
        console.log('Processing question:', eq.question.id, 'images field:', eq.question.images);
        return {
          id: eq.question.id,
          content: eq.question.content,
          type: eq.question.type,
          images: (() => {
            if (!eq.question.images) {
              console.log('No images field for question', eq.question.id);
              return [];
            }
            try {
              const parsed = JSON.parse(eq.question.images);
              console.log('Parsed images for question', eq.question.id, ':', parsed);
              return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
              console.log('Failed to parse images for question', eq.question.id, ':', eq.question.images);
              return [];
            }
          })(),
          options: eq.question.options ? (() => {
            try {
              const parsed = JSON.parse(eq.question.options);
              // 如果是对象数组，提取content字段；如果是字符串数组，直接返回
              return Array.isArray(parsed) 
                ? parsed.map(opt => typeof opt === 'string' ? opt : opt.content || opt.label || String(opt))
                : parsed;
            } catch {
              return null;
            }
          })() : null,
          score: eq.score,
          order: eq.order,
        };
      }),
    };
  }

  async submitExam(examId: string, examStudentId: string, answers: Record<string, any>) {
    console.log(`开始提交考试: examId=${examId}, examStudentId=${examStudentId}`);
    console.log(`提交的答案:`, JSON.stringify(answers, null, 2));
    
    // 检查是否已经提交过
    const existingSubmission = await this.prisma.submission.findFirst({
      where: { examId, examStudentId },
    });

    if (existingSubmission) {
      throw new ConflictException('考试已提交，不能重复提交');
    }

    // 获取考试信息用于评分
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    // 自动评分
    const gradingResults = await this.autoGradeSubmission(exam, answers, (progress) => {
      console.log(`评分进度: ${progress.current}/${progress.total} - ${progress.message}`);
    });
    
    // 创建提交记录，包含详细评分信息
    const submission = await this.prisma.submission.create({
      data: {
        examId,
        examStudentId,
        answers: JSON.stringify(answers),
        score: gradingResults.totalScore,
        isAutoGraded: gradingResults.isFullyAutoGraded,
        // 存储详细评分结果，确保可以安全序列化
        gradingDetails: JSON.stringify({
          details: gradingResults.details,
          totalScore: gradingResults.totalScore,
          maxTotalScore: gradingResults.maxTotalScore,
          isFullyAutoGraded: gradingResults.isFullyAutoGraded,
        }),
      },
    });

    return {
      id: submission.id,
      score: submission.score,
      isAutoGraded: submission.isAutoGraded,
      submittedAt: submission.submittedAt,
      gradingResults: gradingResults,
    };
  }

  private progressStreams = new Map<string, any>();

  async submitExamAsync(examId: string, examStudentId: string, answers: Record<string, any>) {
    const streamKey = `${examId}-${examStudentId}`;
    
    try {
      // 检查是否已经提交过
      const existingSubmission = await this.prisma.submission.findFirst({
        where: { examId, examStudentId },
      });

      if (existingSubmission) {
        this.sendProgress(streamKey, { type: 'error', message: '考试已提交，不能重复提交' });
        return;
      }

      // 获取考试信息
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!exam) {
        this.sendProgress(streamKey, { type: 'error', message: '考试不存在' });
        return;
      }

      this.sendProgress(streamKey, { type: 'progress', current: 0, total: exam.examQuestions.length, message: '开始评分' });

      // 自动评分
      const gradingResults = await this.autoGradeSubmission(exam, answers, (progress) => {
        this.sendProgress(streamKey, { type: 'progress', ...progress });
      });

      // 创建提交记录
      const submission = await this.prisma.submission.create({
        data: {
          examId,
          examStudentId,
          answers: JSON.stringify(answers),
          score: gradingResults.totalScore,
          isAutoGraded: gradingResults.isFullyAutoGraded,
          gradingDetails: JSON.stringify({
            details: gradingResults.details,
            totalScore: gradingResults.totalScore,
            maxTotalScore: gradingResults.maxTotalScore,
            isFullyAutoGraded: gradingResults.isFullyAutoGraded,
          }),
        },
      });

      this.sendProgress(streamKey, { 
        type: 'complete', 
        submission: {
          id: submission.id,
          score: submission.score,
          isAutoGraded: submission.isAutoGraded,
          submittedAt: submission.submittedAt,
        }
      });

    } catch (error) {
      console.error('异步提交失败:', error);
      this.sendProgress(streamKey, { type: 'error', message: error.message });
    }
  }

  private sendProgress(streamKey: string, data: any) {
    const stream = this.progressStreams.get(streamKey);
    if (stream) {
      stream.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  async streamSubmissionProgress(examId: string, examStudentId: string, res: any) {
    const streamKey = `${examId}-${examStudentId}`;
    this.progressStreams.set(streamKey, res);

    // 检查是否已完成
    const existingSubmission = await this.prisma.submission.findFirst({
      where: { examId, examStudentId },
    });

    if (existingSubmission) {
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        submission: {
          id: existingSubmission.id,
          score: existingSubmission.score,
          isAutoGraded: existingSubmission.isAutoGraded,
          submittedAt: existingSubmission.submittedAt,
        }
      })}\n\n`);
      res.end();
      return;
    }

    // 保持连接
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.progressStreams.delete(streamKey);
    });
  }

  async checkSubmissionStatus(examId: string, examStudentId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { examId, examStudentId },
      select: {
        id: true,
        score: true,
        isAutoGraded: true,
        submittedAt: true,
        answers: true,
        gradingDetails: true,
      },
    });

    if (submission) {
      // 解析answers和gradingDetails
      const answers = submission.answers ? JSON.parse(submission.answers) : {};
      const gradingDetails = submission.gradingDetails ? JSON.parse(submission.gradingDetails) : null;
      
      // 将answers对象转换为数组格式，包含评分信息
      const answersArray = Object.entries(answers).map(([questionId, answer]) => {
        const detail = gradingDetails?.details?.[questionId] || {};
        return {
          questionId,
          answer,
          score: detail.score || 0,
          maxScore: detail.maxScore || 0,
          feedback: detail.feedback || null,
        };
      });

      const parsedSubmission = {
        ...submission,
        answers: answersArray,
        gradingDetails,
      };

      return {
        hasSubmitted: true,
        submission: parsedSubmission,
      };
    }

    return {
      hasSubmitted: false,
      submission: null,
    };
  }

  // 自动评分方法
  private async autoGradeSubmission(
    exam: any, 
    answers: Record<string, any>,
    onProgress?: (progress: { current: number; total: number; message: string }) => void
  ) {
    console.log(`开始自动评分: 考试ID=${exam.id}, 题目数量=${exam.examQuestions.length}`);
    console.log(`考试题目类型分布:`, exam.examQuestions.map(eq => ({ id: eq.question.id, type: eq.question.type })));
    
    const details: Record<string, any> = {};
    let totalScore = 0;
    let isFullyAutoGraded = true;
    
    const totalQuestions = exam.examQuestions.length;
    let currentQuestion = 0;

    for (const examQuestion of exam.examQuestions) {
      currentQuestion++;
      const question = examQuestion.question;
      const studentAnswer = answers[question.id];
      const maxScore = examQuestion.score;

      onProgress?.({
        current: currentQuestion,
        total: totalQuestions,
        message: `正在评分第${currentQuestion}题 (${question.type})`
      });

      console.log(`处理题目 ${currentQuestion}: 类型=${question.type}, ID=${question.id}`);

      if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
        // 客观题自动评分
        const isCorrect = this.compareAnswers(studentAnswer, question.answer, question.type);
        const score = isCorrect ? maxScore : 0;
        
        details[question.id] = {
          type: 'objective',
          studentAnswer,
          correctAnswer: question.answer,
          isCorrect,
          score,
          maxScore,
          feedback: isCorrect ? '答案正确' : `正确答案：${question.answer}`,
        };
        
        totalScore += score;
      } else if (question.type === 'ESSAY' || question.type === 'FILL_BLANK') {
        // 主观题AI评分
        onProgress?.({
          current: currentQuestion,
          total: totalQuestions,
          message: `正在AI评分第${currentQuestion}题 (主观题)`
        });
        
        console.log(`=== 开始真实AI评分 ===`);
        console.log(`题目ID: ${question.id}, 类型: ${question.type}`);
        
        const aiResult = await this.getAIGradingForSubjective(
          question.content,
          question.answer || '',
          studentAnswer || '',
          maxScore,
        );
        
        details[question.id] = {
          type: 'subjective',
          studentAnswer,
          referenceAnswer: question.answer,
          aiGrading: aiResult,
          score: aiResult.suggestedScore,
          maxScore,
          needsReview: aiResult.confidence < 0.8, // 置信度低于80%需要人工复审
        };
        
        totalScore += aiResult.suggestedScore;
        
        // 如果有主观题，标记为需要人工确认
        if (aiResult.confidence < 0.9) {
          isFullyAutoGraded = false;
        }
      }
    }

    onProgress?.({
      current: totalQuestions,
      total: totalQuestions,
      message: '评分完成'
    });

    return {
      details,
      totalScore: Math.round(totalScore * 100) / 100, // 保留两位小数
      maxTotalScore: exam.totalScore,
      isFullyAutoGraded,
    };
  }

  // 改进的AI评分方法（仅在学生提交时使用）
  private async getAIGradingForSubjective(
    questionContent: string,
    referenceAnswer: string,
    studentAnswer: string,
    maxScore: number,
  ) {
    console.log(`=== 开始AI评分主观题 ===`);
    console.log(`题目内容: ${questionContent}`);
    console.log(`参考答案: ${referenceAnswer}`);
    console.log(`学生答案: ${studentAnswer}`);
    console.log(`满分: ${maxScore}`);
    
    if (!studentAnswer || studentAnswer.trim() === '') {
      console.log(`学生未作答，返回0分`);
      return {
        suggestedScore: 0,
        reasoning: '学生未作答',
        suggestions: '请完成此题',
        confidence: 1.0,
      };
    }

    // 构建AI评分提示词
    const prompt = await this.buildGradingPrompt(questionContent, referenceAnswer, studentAnswer, maxScore);
    
    try {
      // 调用真实的AI服务进行评分
      const aiResult = await this.aiService.gradeSubjectiveAnswer(prompt);
      
      console.log('AI评分结果:', JSON.stringify(aiResult, null, 2));
      
      return {
        suggestedScore: aiResult.score,
        reasoning: aiResult.reasoning,
        suggestions: aiResult.suggestions,
        confidence: aiResult.confidence,
      };
    } catch (error) {
      console.error('AI评分失败:', error);
      
      // AI评分失败时的降级处理
      const wordCount = studentAnswer.length;
      const hasKeywords = referenceAnswer ? this.checkKeywords(studentAnswer, referenceAnswer) : 0.5;
      const isValidAnswer = this.isValidAnswer(studentAnswer);
      
      let scoreRatio = 0;
      if (isValidAnswer) {
        scoreRatio = 0.3;
        if (wordCount > 20) scoreRatio += 0.1;
        if (wordCount > 50) scoreRatio += 0.1;
        if (hasKeywords > 0.3) scoreRatio += 0.3;
        if (wordCount > 100 && hasKeywords > 0.5) scoreRatio += 0.2;
      }
      
      scoreRatio = Math.min(scoreRatio, 1.0);
      const suggestedScore = Math.round(maxScore * scoreRatio);
      
      return {
        suggestedScore,
        reasoning: `AI评分服务暂时不可用，使用备用评分算法。${this.generateReasoning(scoreRatio, wordCount, hasKeywords)}`,
        suggestions: '请教师手动复核此题评分',
        confidence: 0.3,
      };
    }
  }

  // 构建AI评分提示词
  private async buildGradingPrompt(questionContent: string, referenceAnswer: string, studentAnswer: string, maxScore: number): Promise<string> {
    // 从系统设置获取评分提示词模板
    const gradingTemplate = await this.getSystemSetting('GRADING_PROMPT_TEMPLATE');
    
    if (gradingTemplate) {
      // 使用系统配置的模板，替换变量
      return gradingTemplate
        .replace('{questionContent}', questionContent)
        .replace('{questionType}', '主观题')
        .replace('{referenceAnswer}', referenceAnswer || '无标准答案，请根据题目要求和答案质量评分')
        .replace('{studentAnswer}', studentAnswer)
        .replace('{maxScore}', maxScore.toString());
    }
    
    // 如果没有配置，使用默认模板
    return `你是一位专业的教师，请对以下学生答案进行评分。

**题目内容：**
${questionContent}

**参考答案：**
${referenceAnswer || '无标准答案，请根据题目要求和答案质量评分'}

**学生答案：**
${studentAnswer}

**评分要求：**
- 满分：${maxScore}分
- 请从以下几个维度评分：
  1. 内容准确性（40%）：答案是否正确回答了问题
  2. 完整性（30%）：答案是否涵盖了主要要点
  3. 逻辑性（20%）：答案是否条理清晰、逻辑合理
  4. 表达质量（10%）：语言表达是否清晰、规范

**请返回JSON格式：**
{
  "score": 具体分数(0-${maxScore}),
  "reasoning": "详细的评分理由",
  "suggestions": "改进建议",
  "confidence": 评分置信度(0-1)
}

请确保评分公正、客观，并提供建设性的反馈。`;
  }

  // 获取系统设置
  private async getSystemSetting(key: string): Promise<string | null> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key }
      });
      return setting?.value || null;
    } catch (error) {
      console.error(`获取系统设置失败: ${key}`, error);
      return null;
    }
  }

  // 检查答案有效性
  private isValidAnswer(studentAnswer: string): boolean {
    if (!studentAnswer || studentAnswer.trim().length < 3) {
      return false;
    }
    
    const answer = studentAnswer.trim().toLowerCase();
    
    // 检查是否只是数字或无意义字符
    if (/^[0-9\s]+$/.test(answer)) {
      return false;
    }
    
    // 检查是否只是重复字符
    if (/^(.)\1{4,}$/.test(answer)) {
      return false;
    }
    
    // 检查是否包含有意义的中文或英文词汇
    const hasChineseWords = /[\u4e00-\u9fa5]{2,}/.test(answer);
    const hasEnglishWords = /[a-z]{3,}/.test(answer);
    
    return hasChineseWords || hasEnglishWords;
  }

  // 检查关键词匹配度
  private checkKeywords(studentAnswer: string, referenceAnswer: string): number {
    if (!referenceAnswer) return 0.5;
    
    const studentWords = studentAnswer.toLowerCase().split(/\s+/);
    const referenceWords = referenceAnswer.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    for (const word of referenceWords) {
      if (word.length > 2 && studentWords.some(sw => sw.includes(word) || word.includes(sw))) {
        matchCount++;
      }
    }
    
    return referenceWords.length > 0 ? matchCount / referenceWords.length : 0;
  }

  // 生成评分理由
  private generateReasoning(scoreRatio: number, wordCount: number, keywordMatch: number): string {
    const reasons = [];
    
    if (scoreRatio >= 0.9) {
      reasons.push('答案质量优秀');
    } else if (scoreRatio >= 0.7) {
      reasons.push('答案基本正确');
    } else if (scoreRatio >= 0.5) {
      reasons.push('答案部分正确');
    } else {
      reasons.push('答案需要改进');
    }
    
    if (wordCount < 20) {
      reasons.push('答案过于简短');
    } else if (wordCount > 100) {
      reasons.push('答案详细充实');
    }
    
    if (keywordMatch > 0.5) {
      reasons.push('涵盖了主要要点');
    } else if (keywordMatch < 0.3) {
      reasons.push('缺少关键要点');
    }
    
    return reasons.join('，');
  }

  // 生成改进建议
  private generateSuggestions(scoreRatio: number): string {
    if (scoreRatio >= 0.9) {
      return '答案很好，继续保持';
    } else if (scoreRatio >= 0.7) {
      return '可以进一步补充细节和例证';
    } else if (scoreRatio >= 0.5) {
      return '建议补充更多要点，加强逻辑性';
    } else {
      return '建议重新组织答案，确保回答了题目要求';
    }
  }

  async saveAnswers(examId: string, examStudentId: string, answers: Record<string, any>) {
    // 检查考试是否存在
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    // 检查是否已经提交过（只有正式提交才不允许保存）
    const existingSubmission = await this.prisma.submission.findFirst({
      where: { examId, examStudentId },
    });

    if (existingSubmission) {
      throw new ConflictException('考试已提交，不能再保存答案');
    }

    // 检查考试时间
    const now = new Date();
    if (now > exam.endTime) {
      throw new ConflictException('考试已结束，不能保存答案');
    }

    // 这里可以实现临时保存逻辑，比如保存到缓存或临时表
    // 暂时返回成功状态
    return { message: '答案保存成功', timestamp: new Date() };
  }

  // 评分相关方法
  async getExamSubmissions(examId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { examId },
      include: {
        examStudent: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map(submission => ({
      id: submission.id,
      student: {
        id: submission.examStudent?.id,
        username: submission.examStudent?.username,
        displayName: submission.examStudent?.displayName,
      },
      answers: JSON.parse(submission.answers),
      score: submission.score,
      isAutoGraded: submission.isAutoGraded,
      isReviewed: submission.isReviewed,
      reviewedBy: submission.reviewedBy,
      reviewedAt: submission.reviewedAt,
      gradingDetails: submission.gradingDetails ? JSON.parse(submission.gradingDetails) : null,
      submittedAt: submission.submittedAt,
    }));
  }

  async gradeSubmission(submissionId: string, scores: Record<string, number>, totalScore: number, reviewerId?: string, feedback?: string) {
    const submission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: totalScore,
        isAutoGraded: false, // 手动评分
        isReviewed: true, // 标记为已复核
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        // 可以添加详细评分信息字段
      },
    });

    return {
      id: submission.id,
      score: submission.score,
      isReviewed: submission.isReviewed,
      reviewedBy: submission.reviewedBy,
      reviewedAt: submission.reviewedAt,
      gradedAt: new Date(),
    };
  }

  async getAIGradingSuggestions(examId: string, submissionId: string) {
    // 直接从数据库获取已存储的评分详情
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('提交记录不存在');
    }

    // 返回已存储的评分详情
    const gradingDetails = submission.gradingDetails ? JSON.parse(submission.gradingDetails) : null;
    
    if (!gradingDetails) {
      throw new NotFoundException('评分详情不存在，请重新提交考试');
    }

    // 转换为前端期望的格式
    const suggestions: Record<string, any> = {};
    
    if (gradingDetails && gradingDetails.details) {
      Object.entries(gradingDetails.details).forEach(([questionId, detail]: [string, any]) => {
        if (detail.type === 'objective') {
          suggestions[questionId] = {
            type: 'objective',
            isCorrect: detail.isCorrect,
            score: detail.score,
            maxScore: detail.maxScore,
            feedback: detail.feedback,
          };
        } else if (detail.type === 'subjective') {
          suggestions[questionId] = {
            type: 'subjective',
            maxScore: detail.maxScore,
            aiSuggestion: {
              suggestedScore: detail.aiGrading.suggestedScore,
              reasoning: detail.aiGrading.reasoning,
              suggestions: detail.aiGrading.suggestions,
              confidence: detail.aiGrading.confidence,
            },
          };
        }
      });
    }

    return {
      submissionId,
      suggestions,
      totalMaxScore: submission.exam.totalScore,
      preGradingInfo: {
        totalScore: gradingDetails.totalScore,
        isFullyAutoGraded: gradingDetails.isFullyAutoGraded,
      },
    };
  }

  private compareAnswers(studentAnswer: any, correctAnswer: string | null, questionType: string): boolean {
    if (!correctAnswer) return false;

    if (questionType === 'SINGLE_CHOICE') {
      return studentAnswer === correctAnswer;
    } else if (questionType === 'MULTIPLE_CHOICE') {
      try {
        const correct = JSON.parse(correctAnswer);
        const student = Array.isArray(studentAnswer) ? studentAnswer : [];
        return JSON.stringify(student.sort()) === JSON.stringify(correct.sort());
      } catch {
        return false;
      }
    }
    return false;
  }

  async generateStudentAccounts(examId: string, count: number, prefix: string = 'student') {
    const exam = await this.findById(examId);

    const students = [];
    for (let i = 1; i <= count; i++) {
      // 使用易记忆的格式生成用户名
      const username = AccountGenerator.generateTemporaryUsername(exam.title, '', i);
      const password = AccountGenerator.generateMemorablePassword();
      
      students.push({
        username,
        password,
        displayName: `学生${i}`,
      });
    }

    return this.batchAddStudents(examId, { students });
  }

  // 从班级导入固定学生
  async importStudentsFromClass(examId: string, classId: string) {
    await this.findById(examId);

    const students = await this.prisma.student.findMany({
      where: { classId },
    });

    const results = [];
    const errors = [];

    for (const student of students) {
      try {
        const username = AccountGenerator.generatePermanentUsername(student.studentId);
        
        // 检查是否已存在
        const existing = await this.prisma.examStudent.findFirst({
          where: { examId, username },
        });

        if (existing) {
          errors.push({
            studentId: student.studentId,
            error: '学生已存在于考试中',
          });
          continue;
        }

        const examStudent = await this.prisma.examStudent.create({
          data: {
            examId,
            username,
            password: student.password, // 使用固定学生的密码
            displayName: student.name,
            accountType: 'PERMANENT',
            studentId: student.studentId,
          },
        });

        results.push(examStudent);
      } catch (error) {
        errors.push({
          studentId: student.studentId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  // 从Excel/CSV导入临时学生
  async importTemporaryStudents(examId: string, studentsData: Array<{name: string, username?: string}>) {
    const exam = await this.findById(examId);
    
    const results = [];
    const errors = [];

    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i];
      try {
        // 生成易记忆的临时账号用户名
        const username = AccountGenerator.generateTemporaryUsername(
          exam.title, 
          studentData.name, 
          i + 1
        );
        
        // 检查是否已存在
        const existing = await this.prisma.examStudent.findFirst({
          where: { examId, username },
        });

        if (existing) {
          // 如果重复，添加序号后缀
          const fallbackUsername = `${username}_${i + 1}`;
          const existingFallback = await this.prisma.examStudent.findFirst({
            where: { examId, username: fallbackUsername },
          });
          
          if (existingFallback) {
            errors.push({
              name: studentData.name,
              error: '用户名已存在',
            });
            continue;
          }
          
          // 使用后缀用户名
          const password = AccountGenerator.generateMemorablePassword();
          const examStudent = await this.prisma.examStudent.create({
            data: {
              examId,
              username: fallbackUsername,
              password: await bcrypt.hash(password, 10),
              displayName: studentData.name,
              accountType: 'TEMPORARY',
            },
          });

          results.push({
            ...examStudent,
            plainPassword: password,
          });
          continue;
        }

        const password = AccountGenerator.generateMemorablePassword();
        const examStudent = await this.prisma.examStudent.create({
          data: {
            examId,
            username,
            password: await bcrypt.hash(password, 10),
            displayName: studentData.name,
            accountType: 'TEMPORARY',
          },
        });

        results.push({
          ...examStudent,
          plainPassword: password,
        });
      } catch (error) {
        errors.push({
          name: studentData.name,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  private generateRandomPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async getExamAnalytics(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        examStudents: true,
        submissions: {
          include: {
            examStudent: true,
          },
        },
      },
    });

    if (!exam) {
      throw new Error('考试不存在');
    }

    const submissions = exam.submissions;
    const totalStudents = exam.examStudents.length;
    const submittedCount = submissions.length;
    const notSubmittedCount = totalStudents - submittedCount;

    // 成绩统计
    const scores = submissions.map(s => s.score).filter(s => s !== null);
    const scoreStats = {
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: scores.length > 0 ? (scores.filter(s => s >= 60).length / scores.length) * 100 : 0,
    };

    // 题目分析
    const questionStats = [];
    for (const examQuestion of exam.examQuestions) {
      const questionAnswers = [];
      
      for (const submission of submissions) {
        if (submission.answers) {
          const answers = JSON.parse(submission.answers);
          const answer = answers[examQuestion.question.id];
          if (answer !== undefined) {
            questionAnswers.push({
              answer: answer,
              score: submission.gradingDetails ? 
                JSON.parse(submission.gradingDetails)[examQuestion.question.id]?.score || 0 : 0,
              maxScore: examQuestion.score,
            });
          }
        }
      }

      const correctAnswers = questionAnswers.filter(qa => qa.score === qa.maxScore).length;
      const correctRate = questionAnswers.length > 0 ? (correctAnswers / questionAnswers.length) * 100 : 0;
      const averageScore = questionAnswers.length > 0 ? 
        questionAnswers.reduce((sum, qa) => sum + qa.score, 0) / questionAnswers.length : 0;

      questionStats.push({
        questionId: examQuestion.question.id,
        content: examQuestion.question.content,
        type: examQuestion.question.type,
        correctRate,
        averageScore,
        difficulty: examQuestion.question.difficulty,
        knowledgePoint: examQuestion.question.knowledgePoint,
      });
    }

    // 知识点分析
    const knowledgePointMap = new Map();
    questionStats.forEach(qs => {
      const kp = qs.knowledgePoint || '未分类';
      if (!knowledgePointMap.has(kp)) {
        knowledgePointMap.set(kp, {
          knowledgePoint: kp,
          questionCount: 0,
          totalScore: 0,
          maxScore: 0,
          correctCount: 0,
          totalAnswers: 0,
        });
      }
      
      const kpData = knowledgePointMap.get(kp);
      kpData.questionCount++;
      kpData.totalScore += qs.averageScore;
      kpData.maxScore += exam.examQuestions.find(eq => eq.question.id === qs.questionId)?.score || 0;
      
      const questionAnswers = submissions.length;
      kpData.totalAnswers += questionAnswers;
      kpData.correctCount += (qs.correctRate / 100) * questionAnswers;
    });

    const knowledgePointStats = Array.from(knowledgePointMap.values()).map(kp => ({
      knowledgePoint: kp.knowledgePoint,
      questionCount: kp.questionCount,
      averageScore: kp.questionCount > 0 ? kp.totalScore / kp.questionCount : 0,
      masteryRate: kp.totalAnswers > 0 ? (kp.correctCount / kp.totalAnswers) * 100 : 0,
    }));

    // 参与情况统计
    const participationStats = {
      totalStudents,
      submittedCount,
      notSubmittedCount,
      participationRate: totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0,
    };

    return {
      scoreStats,
      questionStats,
      knowledgePointStats,
      participationStats,
    };
  }

  async generateAIReport(examId: string, data: any, userId?: string) {
    try {
      // 获取用户的默认AI Provider设置
      const aiProvider = await this.prisma.aIProvider.findFirst({
        where: {
          isActive: true,
          OR: [
            { isGlobal: true },
            { createdBy: userId }
          ]
        },
        orderBy: [
          { isGlobal: 'asc' }, // 优先使用用户自己的配置
          { createdAt: 'desc' }
        ]
      });

      if (!aiProvider) {
        throw new Error('未找到可用的AI Provider，请先在设置页面配置AI服务');
      }

      // 构建分析报告的提示词
      const prompt = this.buildAnalysisPrompt(data.exam, data.analytics);

      // 调用AI服务生成报告
      const report = await this.callAIService(aiProvider, prompt);

      return { report };
    } catch (error) {
      console.error('生成AI报告失败:', error);
      throw new Error(`生成AI分析报告失败: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(exam: any, analytics: any): string {
    return `请基于以下考试数据生成一份详细的分析报告：

考试信息：
- 考试名称：${exam.title}
- 考试描述：${exam.description || '无'}
- 考试时长：${exam.duration}分钟
- 总分：${exam.totalScore}分
- 题目数量：${exam.examQuestions?.length || 0}道

统计数据：
- 平均分：${analytics.scoreStats?.average?.toFixed(1) || 0}分
- 最高分：${analytics.scoreStats?.highest || 0}分
- 最低分：${analytics.scoreStats?.lowest || 0}分
- 及格率：${analytics.scoreStats?.passRate?.toFixed(1) || 0}%
- 参与学生：${analytics.participationStats?.submittedCount || 0}人
- 参与率：${analytics.participationStats?.participationRate?.toFixed(1) || 0}%

题目分析：
${analytics.questionStats?.map((q: any, index: number) => 
  `第${index + 1}题 - 正确率：${q.correctRate?.toFixed(1) || 0}%，平均得分：${q.averageScore?.toFixed(1) || 0}分`
).join('\n') || '无题目数据'}

知识点分析：
${analytics.knowledgePointStats?.map((kp: any) => 
  `${kp.knowledgePoint || '未分类'} - 掌握率：${kp.masteryRate?.toFixed(1) || 0}%，平均得分：${kp.averageScore?.toFixed(1) || 0}分`
).join('\n') || '无知识点数据'}

请从以下几个方面进行分析：
1. 整体考试表现评价
2. 学生掌握情况分析
3. 题目难度和区分度分析
4. 知识点掌握情况分析
5. 教学建议和改进方向

请用中文回答，内容要专业、详细、有针对性。`;
  }

  private async callAIService(aiProvider: any, prompt: string): Promise<string> {
    const apiKey = aiProvider.apiKey;
    const baseUrl = aiProvider.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = aiProvider.model || 'qwen-turbo';

    console.log('调用AI服务:', { baseUrl, model, hasApiKey: !!apiKey });

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      console.log('AI服务响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI服务错误响应:', errorText);
        throw new Error(`AI服务调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('AI服务响应:', result);
      
      return result.choices?.[0]?.message?.content || '生成报告失败';
    } catch (error) {
      console.error('AI服务调用异常:', error);
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
  }
}
