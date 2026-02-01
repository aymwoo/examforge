import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { AIService } from '../ai/ai.service';
import { SettingsService, AIProvider } from '../settings/settings.service';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AccountGenerator } from '../../common/utils/account-generator';
import { QuestionType } from '@/common/enums/question.enum';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { Response } from 'express';

@Injectable()
export class ExamService implements OnModuleInit, OnModuleDestroy {
  private downloadCleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService
  ) {}

  onModuleInit() {
    // Best-effort periodic cleanup; avoids unbounded growth on restarts.
    const intervalMs = 10 * 60_000;
    this.downloadCleanupTimer = setInterval(() => {
      this.cleanupExpiredExportZips().catch(() => {});
    }, intervalMs);

    // Run once shortly after boot.
    setTimeout(() => {
      this.cleanupExpiredExportZips().catch(() => {});
    }, 5_000);
  }

  onModuleDestroy() {
    if (this.downloadCleanupTimer) {
      clearInterval(this.downloadCleanupTimer);
      this.downloadCleanupTimer = undefined;
    }
  }

  private async cleanupExpiredExportZips() {
    const downloadsDir = path.join(process.cwd(), 'temp', 'downloads');
    if (!fs.existsSync(downloadsDir)) return;

    const retentionMinutes = Number(
      this.configService.get<string>('EXAM_EXPORT_ZIP_RETENTION_MINUTES') ?? '30'
    );
    const retentionMs = Number.isFinite(retentionMinutes)
      ? Math.max(1, retentionMinutes) * 60_000
      : 30 * 60_000;

    const now = Date.now();
    const files = await fs.promises.readdir(downloadsDir).catch(() => [] as string[]);

    await Promise.all(
      files
        .filter((filename) => filename.startsWith('exam_export_') && filename.endsWith('.zip'))
        .map(async (filename) => {
          const filePath = path.join(downloadsDir, filename);
          const stat = await fs.promises.stat(filePath).catch(() => null);
          if (!stat) return;

          // Use mtime as a best-effort indicator; file name timestamp may not be reliable.
          if (now - stat.mtimeMs > retentionMs) {
            await fs.promises.unlink(filePath).catch(() => {});
          }
        })
    );
  }

  async create(dto: CreateExamDto, userId?: string) {
    const data: any = {
      title: dto.title,
      description: dto.description,
      duration: dto.duration,
      totalScore: dto.totalScore || 100,
      accountModes: JSON.stringify(dto.accountModes || ['TEMPORARY_IMPORT']),
      feedbackVisibility: dto.feedbackVisibility || 'FINAL_SCORE',
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      status: 'DRAFT',
    };

    if (userId) {
      data.createdBy = userId;
    }

    return this.prisma.exam.create({ data });
  }

  async getDashboardStats(userId?: string, userRole?: string) {
    // Base query conditions - show all published exams, not just ongoing
    const baseWhere: any = {
      status: 'PUBLISHED',
      deletedAt: null,
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
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // Filter for ongoing exams (for the ongoing count)
    const now = new Date();
    const ongoingExams = publishedExams.filter((exam) => {
      // If no start/end time set, consider it as ongoing if published
      if (!exam.startTime && !exam.endTime) return true;

      // If only start time is set, check if it has started
      if (exam.startTime && !exam.endTime) {
        return now >= exam.startTime;
      }

      // If only end time is set, check if it hasn't ended
      if (!exam.startTime && exam.endTime) {
        return now <= exam.endTime;
      }

      // If both times are set, check if current time is within the range
      return now >= exam.startTime && now <= exam.endTime;
    });

    // Calculate statistics
    const stats = {
      ongoingExams: ongoingExams.length,
      totalStudents: publishedExams.reduce((sum, exam) => sum + exam.examStudents.length, 0),
      totalSubmissions: publishedExams.reduce((sum, exam) => sum + exam.submissions.length, 0),
      totalQuestions: totalQuestions,
      exams: ongoingExams.map((exam) => ({
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
        creator: exam.creator
          ? {
              id: exam.creator.id,
              name: exam.creator.name,
              username: exam.creator.username,
            }
          : null,
      })),
    };

    return stats;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 20, status, includeDeleted, onlyDeleted } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    if (onlyDeleted) {
      where.deletedAt = { not: null };
    } else if (!includeDeleted) {
      where.deletedAt = null;
    } else {
      delete where.deletedAt;
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
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
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
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
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

  async update(id: string, dto: UpdateExamDto, userId?: string, userRole?: string) {
    const exam = await this.findById(id);

    // 权限检查：如果指定了用户且不是管理员，则必须是考试创建者
    if (userId && userRole !== 'ADMIN') {
      const examCreator = (exam as any).createdBy;
      if (examCreator && String(examCreator) !== String(userId)) {
        console.warn(
          `[Permission Denied] Update Exam ${id}: Creator=${examCreator} (${typeof examCreator}), User=${userId} (${typeof userId})`
        );
        throw new ForbiddenException('您没有权限修改此考试');
      }
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.totalScore !== undefined) updateData.totalScore = dto.totalScore;
    if (dto.accountModes !== undefined) updateData.accountModes = JSON.stringify(dto.accountModes);
    if (dto.startTime !== undefined)
      updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.feedbackVisibility !== undefined) {
      updateData.feedbackVisibility = dto.feedbackVisibility;
    }

    const updated = await this.prisma.exam.update({
      where: { id },
      data: updateData as any,
    });

    return updated;
  }

  async delete(id: string, userId?: string, userRole?: string) {
    const exam = await this.findById(id);

    // 权限检查：如果指定了用户且不是管理员，则必须是考试创建者
    if (userId && userRole !== 'ADMIN') {
      const examCreator = (exam as any).createdBy;
      if (examCreator && String(examCreator) !== String(userId)) {
        console.warn(
          `[Permission Denied] Delete Exam ${id}: Creator=${examCreator} (${typeof examCreator}), User=${userId} (${typeof userId})`
        );
        throw new ForbiddenException('您没有权限删除此考试');
      }
    }

    await this.prisma.exam.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      } as any,
    });
  }

  async restore(id: string) {
    await this.prisma.exam.update({
      where: { id },
      data: { deletedAt: null } as any,
    });
  }

  async hardDelete(id: string, name: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!(exam as any).deletedAt) {
      throw new BadRequestException('Exam must be in recycle bin before hard delete');
    }

    if (exam.title !== name) {
      throw new BadRequestException('Exam name does not match');
    }

    await this.prisma.exam.delete({ where: { id } });
  }

  async copy(id: string, userId: string) {
    const originalExam = await this.findById(id);

    // 创建新考试（复制基本信息）
    const newExam = await this.prisma.exam.create({
      data: {
        title: `${originalExam.title} - 副本`,
        description: originalExam.description,
        duration: originalExam.duration,
        totalScore: originalExam.totalScore,
        status: 'DRAFT', // 新考试默认为草稿状态
        accountModes: JSON.stringify(originalExam.accountModes), // 转换数组为JSON字符串
        createdBy: userId, // 设置为当前用户
      },
    });

    // 复制考试题目
    if (originalExam.examQuestions && originalExam.examQuestions.length > 0) {
      const examQuestions = originalExam.examQuestions.map((eq: any) => ({
        examId: newExam.id,
        questionId: eq.questionId,
        order: eq.order,
        score: eq.score,
      }));

      await this.prisma.examQuestion.createMany({
        data: examQuestions,
      });
    }

    return this.findById(newExam.id);
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

  async batchUpdateQuestionScores(
    examId: string,
    updates: { questionId: string; score: number }[]
  ) {
    await this.findById(examId);

    const promises = updates.map(async ({ questionId, score }) => {
      const examQuestion = await this.prisma.examQuestion.findFirst({
        where: { examId, questionId },
      });

      if (!examQuestion) {
        throw new NotFoundException(`题目 ${questionId} 不存在于此考试中`);
      }

      return this.prisma.examQuestion.update({
        where: { id: examQuestion.id },
        data: { score },
      });
    });

    return Promise.all(promises);
  }

  async batchUpdateQuestionOrders(
    examId: string,
    updates: { questionId: string; order: number }[]
  ) {
    await this.findById(examId);

    const promises = updates.map(async ({ questionId, order }) => {
      const examQuestion = await this.prisma.examQuestion.findFirst({
        where: { examId, questionId },
      });

      if (!examQuestion) {
        throw new NotFoundException(`题目 ${questionId} 不存在于此考试中`);
      }

      return this.prisma.examQuestion.update({
        where: { id: examQuestion.id },
        data: { order },
      });
    });

    return Promise.all(promises);
  }

  async batchRemoveQuestions(examId: string, questionIds: string[]) {
    await this.findById(examId);

    const examQuestions = await this.prisma.examQuestion.findMany({
      where: {
        examId,
        questionId: { in: questionIds },
      },
    });

    if (examQuestions.length === 0) {
      throw new NotFoundException('没有找到要删除的题目');
    }

    const deletePromises = examQuestions.map((eq) =>
      this.prisma.examQuestion.delete({ where: { id: eq.id } })
    );

    await Promise.all(deletePromises);

    return { deletedCount: deletePromises.length };
  }

  private transformExam(exam: any) {
    return {
      ...exam,
      accountModes: this.safeParseAccountModes(exam.accountModes),
      examQuestions: exam.examQuestions.map((eq: any) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        order: eq.order,
        score: eq.score,
        question: this.transformExamQuestion(eq.question),
      })),
      submissionCount: exam._count.submissions,
      totalStudents: exam._count.examStudents,
      _count: undefined,
    };
  }

  private transformExamQuestion(question: any) {
    if (!question) return question;
    let matching = undefined;
    if (question.type === QuestionType.MATCHING) {
      matching = this.parseMatchingAnswer(question.answer);
    }
    return {
      ...question,
      matching,
      options: this.safeParseOptions(question.options),
    };
  }

  private parseMatchingAnswer(answer?: string | null) {
    if (!answer) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) {
        const matches: Record<string, string> = {};
        const leftItems: string[] = [];
        const rightItems: string[] = [];
        parsed.forEach((pair) => {
          if (pair?.left && pair?.right) {
            const left = String(pair.left);
            const right = String(pair.right);
            matches[left] = right;
            leftItems.push(left);
            rightItems.push(right);
          }
        });
        return {
          leftItems,
          rightItems: Array.from(new Set(rightItems)),
          matches,
        };
      }

      if (parsed && typeof parsed === 'object') {
        const matches = (parsed as { matches?: Record<string, string> }).matches || {};
        const leftItems = (parsed as { leftItems?: string[] }).leftItems || Object.keys(matches);
        const rightItems =
          (parsed as { rightItems?: string[] }).rightItems || Object.values(matches);
        return {
          leftItems,
          rightItems: Array.from(new Set(rightItems.map((item) => String(item)))) as string[],
          matches: Object.fromEntries(
            Object.entries(matches).map(([left, right]) => [String(left), String(right)])
          ),
        };
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private safeParseOptions(optionsStr: string | null | undefined): string[] | undefined {
    if (!optionsStr || typeof optionsStr !== 'string' || !optionsStr.trim()) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(optionsStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private safeParseAccountModes(accountModesStr: string | null | undefined): string[] {
    if (!accountModesStr || typeof accountModesStr !== 'string' || !accountModesStr.trim()) {
      return ['TEMPORARY_IMPORT'];
    }
    try {
      const parsed = JSON.parse(accountModesStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return ['TEMPORARY_IMPORT'];
    } catch {
      return ['TEMPORARY_IMPORT'];
    }
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
        studentId: true,
        accountType: true,
        createdAt: true,
        student: {
          select: {
            class: {
              select: {
                name: true,
              },
            },
          },
        },
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
      feedbackVisibility: (exam as any).feedbackVisibility as
        | 'FINAL_SCORE'
        | 'ANSWERS'
        | 'FULL_DETAILS',
      questions: exam.examQuestions.map((eq) => {
        console.log('Processing question:', eq.question.id, 'images field:', eq.question.images);
        return {
          id: eq.question.id,
          content: eq.question.content,
          type: eq.question.type,
          matching: this.parseMatchingAnswer(eq.question.answer),
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
              console.log(
                'Failed to parse images for question',
                eq.question.id,
                ':',
                eq.question.images
              );
              return [];
            }
          })(),
          options: eq.question.options
            ? (() => {
                try {
                  const parsed = JSON.parse(eq.question.options);
                  // 如果是对象数组，提取content字段；如果是字符串数组，直接返回
                  return Array.isArray(parsed)
                    ? parsed.map((opt) =>
                        typeof opt === 'string' ? opt : opt.content || opt.label || String(opt)
                      )
                    : parsed;
                } catch {
                  return null;
                }
              })()
            : null,
          score: eq.score,
          order: eq.order,
        };
      }),
    };
  }

  async submitExam(examId: string, examStudentId: string, answers: Record<string, any>) {
    // 检查是否已经有正式提交的记录
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        examId,
        examStudentId,
        isAutoGraded: true, // 只检查正式提交的记录
      },
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

    // 检查是否有草稿记录（无评分详情），如果有则更新，否则创建新记录
    const draftSubmission = await this.prisma.submission.findFirst({
      where: {
        examId,
        examStudentId,
        gradingDetails: null,
      },
    });

    let submission;
    if (draftSubmission) {
      // 更新草稿为正式提交
      submission = await this.prisma.submission.update({
        where: { id: draftSubmission.id },
        data: {
          answers: JSON.stringify(answers),
          score: gradingResults.totalScore,
          isAutoGraded: gradingResults.isFullyAutoGraded,
          gradingDetails: JSON.stringify({
            totalScore: gradingResults.totalScore,
            maxTotalScore: gradingResults.maxTotalScore,
            details: gradingResults.details,
            isFullyAutoGraded: gradingResults.isFullyAutoGraded,
          }),
          submittedAt: new Date(),
        },
      });
    } else {
      // 创建新的提交记录
      submission = await this.prisma.submission.create({
        data: {
          examId,
          examStudentId,
          answers: JSON.stringify(answers),
          score: gradingResults.totalScore,
          isAutoGraded: gradingResults.isFullyAutoGraded,
          gradingDetails: JSON.stringify({
            totalScore: gradingResults.totalScore,
            maxTotalScore: gradingResults.maxTotalScore,
            details: gradingResults.details,
            isFullyAutoGraded: gradingResults.isFullyAutoGraded,
          }),
          submittedAt: new Date(),
        },
      });
    }

    return {
      id: submission.id,
      score: submission.score,
      isAutoGraded: submission.isAutoGraded,
      submittedAt: submission.submittedAt,
      answers: answers, // 添加原始答案数据
      gradingResults: gradingResults,
    };
  }

  private progressStreams = new Map<string, any>();

  private safeJsonParse(value: unknown) {
    if (value == null) return null;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private parseSubmissionAnswersArray(rawAnswers: string) {
    const parsed = this.safeJsonParse(rawAnswers);
    if (!parsed) return [];

    // Newer exam submit flow stores `{ [questionId]: answer }`
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, any>).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
    }

    // Older submission flow stores `[{ questionId, answer }]`
    if (Array.isArray(parsed)) {
      return parsed as Array<{ questionId: string; answer: any }>;
    }

    return [];
  }

  private parseSubmissionAnswersMap(rawAnswers: string) {
    const parsed = this.safeJsonParse(rawAnswers);
    if (!parsed) return {};

    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }

    if (Array.isArray(parsed)) {
      return Object.fromEntries(
        (parsed as Array<{ questionId: string; answer: any }>).map((a) => [a.questionId, a.answer])
      );
    }

    return {};
  }

  async submitExamAsync(examId: string, examStudentId: string, answers: Record<string, any>) {
    const streamKey = `${examId}-${examStudentId}`;
    let isCompleted = false;

    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error(`Submit exam timeout for ${streamKey}`);
        this.sendProgress(streamKey, { type: 'error', message: '评分超时，请稍后查看结果' });
      }
    }, 300000);

    try {
      // 检查是否已经提交过（以 gradingDetails 是否存在判断正式提交）
      const existingSubmission = await this.prisma.submission.findFirst({
        where: { examId, examStudentId, gradingDetails: { not: null } },
      });

      if (existingSubmission) {
        clearTimeout(timeout);
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
        clearTimeout(timeout);
        this.sendProgress(streamKey, { type: 'error', message: '考试不存在' });
        return;
      }

      this.sendProgress(streamKey, {
        type: 'progress',
        current: 0,
        total: exam.examQuestions.length,
        message: '开始评分',
      });

      // 自动评分
      const gradingResults = await this.autoGradeSubmission(exam, answers, (progress) => {
        this.sendProgress(streamKey, { type: 'progress', ...progress });
      });

      // 创建提交记录
      // 如果存在草稿（来自 save-answers），则将其升级为正式提交，避免出现同一学生多条记录
      const draftSubmission = await this.prisma.submission.findFirst({
        where: { examId, examStudentId, gradingDetails: null },
      });

      const submissionData = {
        answers: JSON.stringify(answers),
        score: gradingResults.totalScore,
        isAutoGraded: gradingResults.isFullyAutoGraded,
        gradingDetails: JSON.stringify({
          details: gradingResults.details,
          totalScore: gradingResults.totalScore,
          maxTotalScore: gradingResults.maxTotalScore,
          isFullyAutoGraded: gradingResults.isFullyAutoGraded,
        }),
        submittedAt: new Date(),
      };

      const submission = draftSubmission
        ? await this.prisma.submission.update({
            where: { id: draftSubmission.id },
            data: submissionData,
          })
        : await this.prisma.submission.create({
            data: {
              examId,
              examStudentId,
              ...submissionData,
            },
          });

      isCompleted = true;
      clearTimeout(timeout);

      this.sendProgress(streamKey, {
        type: 'complete',
        submission: {
          id: submission.id,
          score: submission.score,
          isAutoGraded: submission.isAutoGraded,
          submittedAt: submission.submittedAt,
          answers: answers,
          gradingResults: gradingResults,
        },
      });

      console.log('发送完成事件，包含gradingResults:', !!gradingResults);
    } catch (error) {
      clearTimeout(timeout);
      console.error('异步提交失败:', error);
      const errorMessage = error instanceof Error ? error.message : '评分过程中出现未知错误';
      this.sendProgress(streamKey, { type: 'error', message: errorMessage });
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

    try {
      this.progressStreams.set(streamKey, res);

      // 立即发送握手确认，确保连接建立
      res.flushHeaders?.();
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 连接已建立' })}\n\n`);

      // 检查是否已完成（排除草稿）
      const existingSubmission = await this.prisma.submission.findFirst({
        where: { examId, examStudentId, gradingDetails: { not: null } },
      });

      if (existingSubmission) {
        res.write(
          `data: ${JSON.stringify({
            type: 'complete',
            submission: {
              id: existingSubmission.id,
              score: existingSubmission.score,
              isAutoGraded: existingSubmission.isAutoGraded,
              submittedAt: existingSubmission.submittedAt,
              answers: this.parseSubmissionAnswersMap(existingSubmission.answers),
              answersArray: this.parseSubmissionAnswersArray(existingSubmission.answers),
            },
          })}\n\n`
        );

        // 延迟关闭连接，确保数据被客户端接收
        setTimeout(() => res.end(), 100);
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

      res.on('error', (error: any) => {
        console.error('SSE connection error:', error);
        clearInterval(keepAlive);
        this.progressStreams.delete(streamKey);
      });
    } catch (error) {
      console.error('Error in streamSubmissionProgress:', error);
      this.progressStreams.delete(streamKey);
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '连接建立失败' })}\n\n`);
      } catch (writeError) {
        // 忽略写入错误，连接可能已经关闭
      }
      setTimeout(() => res.end(), 100);
    }
  }

  async checkSubmissionStatus(examId: string, examStudentId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { examId, examStudentId, gradingDetails: { not: null } },
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
      const answersArray = this.parseSubmissionAnswersArray(submission.answers);
      const gradingDetails = this.safeJsonParse(submission.gradingDetails);

      const answersObj = Object.fromEntries(answersArray.map((a: any) => [a.questionId, a.answer]));

      // 将 answers 映射转换为数组格式，包含评分信息
      const enrichedAnswersArray = Object.entries(answersObj).map(([questionId, answer]) => {
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
        // 统一对外输出 answers 为对象 map
        answers: this.parseSubmissionAnswersMap(submission.answers),
        // 兼容字段：旧前端可能依赖数组结构
        answersArray: enrichedAnswersArray,
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
  // NOTE: kept private; exposed via `autoGradeSubmissionForRegrade` for offline jobs.
  async autoGradeSubmissionForRegrade(
    exam: any,
    answers: Record<string, any>,
    opts?: {
      onProgress?: (progress: { current: number; total: number; message: string }) => void;
      noAi?: boolean;
    }
  ) {
    if (opts?.noAi) {
      return this.autoGradeSubmissionNoAi(exam, answers, opts.onProgress);
    }

    return this.autoGradeSubmission(exam, answers, opts?.onProgress);
  }

  private async autoGradeSubmissionNoAi(
    exam: any,
    answers: Record<string, any>,
    onProgress?: (progress: { current: number; total: number; message: string }) => void
  ) {
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
        message: `正在评分第${currentQuestion}题 (${question.type})`,
      });

      if (
        question.type === 'SINGLE_CHOICE' ||
        question.type === 'MULTIPLE_CHOICE' ||
        question.type === 'TRUE_FALSE' ||
        question.type === 'MATCHING'
      ) {
        if (question.type === 'MATCHING') {
          const matchingResult = this.gradeMatchingAnswer(studentAnswer, question.answer, maxScore);
          details[question.id] = {
            type: 'objective',
            studentAnswer: studentAnswer !== undefined ? studentAnswer : '',
            correctAnswer: question.answer,
            isCorrect: matchingResult.isFullyCorrect,
            score: matchingResult.score,
            maxScore,
            feedback: matchingResult.feedback,
            correctCount: matchingResult.correctCount,
            totalCount: matchingResult.totalCount,
          };

          totalScore += matchingResult.score;
          continue;
        }
        const correctAnswerText = this.convertAnswerToText(
          question.answer,
          question.options,
          question.type
        );
        const isCorrect = this.compareAnswers(studentAnswer, correctAnswerText, question.type);
        const score = isCorrect ? maxScore : 0;

        details[question.id] = {
          type: 'objective',
          studentAnswer: studentAnswer !== undefined ? studentAnswer : '',
          correctAnswer: correctAnswerText,
          isCorrect,
          score,
          maxScore,
          feedback: isCorrect ? '答案正确' : `正确答案：${correctAnswerText}`,
        };

        totalScore += score;
      } else if (question.type === 'ESSAY' || question.type === 'FILL_BLANK') {
        details[question.id] = {
          type: 'subjective',
          studentAnswer: studentAnswer !== undefined ? studentAnswer : '',
          referenceAnswer: question.answer,
          aiGrading: null,
          score: 0,
          maxScore,
          needsReview: true,
        };

        isFullyAutoGraded = false;
      }
    }

    onProgress?.({
      current: totalQuestions,
      total: totalQuestions,
      message: '评分完成',
    });

    return {
      details,
      totalScore: Math.round(totalScore * 100) / 100,
      maxTotalScore: exam.totalScore,
      isFullyAutoGraded,
    };
  }

  private async autoGradeSubmission(
    exam: any,
    answers: Record<string, any>,
    onProgress?: (progress: { current: number; total: number; message: string }) => void
  ) {
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
        message: `正在评分第${currentQuestion}题 (${question.type})`,
      });

      if (
        question.type === 'SINGLE_CHOICE' ||
        question.type === 'MULTIPLE_CHOICE' ||
        question.type === 'TRUE_FALSE' ||
        question.type === 'MATCHING'
      ) {
        if (question.type === 'MATCHING') {
          const matchingResult = this.gradeMatchingAnswer(studentAnswer, question.answer, maxScore);
          details[question.id] = {
            type: 'objective',
            studentAnswer: studentAnswer !== undefined ? studentAnswer : '',
            correctAnswer: question.answer,
            isCorrect: matchingResult.isFullyCorrect,
            score: matchingResult.score,
            maxScore,
            feedback: matchingResult.feedback,
            correctCount: matchingResult.correctCount,
            totalCount: matchingResult.totalCount,
          };

          totalScore += matchingResult.score;
          continue;
        }
        const correctAnswerText = this.convertAnswerToText(
          question.answer,
          question.options,
          question.type
        );
        const isCorrect = this.compareAnswers(studentAnswer, correctAnswerText, question.type);
        const score = isCorrect ? maxScore : 0;

        details[question.id] = {
          type: 'objective',
          studentAnswer: studentAnswer !== undefined ? studentAnswer : '',
          correctAnswer: correctAnswerText,
          isCorrect,
          score,
          maxScore,
          feedback: isCorrect ? '答案正确' : `正确答案：${correctAnswerText}`,
        };

        totalScore += score;
      } else if (question.type === 'ESSAY' || question.type === 'FILL_BLANK') {
        // 主观题AI评分
        onProgress?.({
          current: currentQuestion,
          total: totalQuestions,
          message: `正在AI评分第${currentQuestion}题 (主观题)`,
        });

        console.log(`=== 开始真实AI评分 ===`);
        console.log(`题目ID: ${question.id}, 类型: ${question.type}`);

        const aiResult = await this.getAIGradingForSubjective(
          question.content,
          question.answer || '',
          studentAnswer || '',
          maxScore
        );

        details[question.id] = {
          type: 'subjective',
          studentAnswer: studentAnswer !== undefined ? studentAnswer : '', // 确保显示实际答案
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
      message: '评分完成',
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
    maxScore: number
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
    const prompt = await this.buildGradingPrompt(
      questionContent,
      referenceAnswer,
      studentAnswer,
      maxScore
    );

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
      const hasKeywords = referenceAnswer
        ? this.checkKeywords(studentAnswer, referenceAnswer)
        : 0.5;
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
  private async buildGradingPrompt(
    questionContent: string,
    referenceAnswer: string,
    studentAnswer: string,
    maxScore: number
  ): Promise<string> {
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
        where: { key },
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
      if (word.length > 2 && studentWords.some((sw) => sw.includes(word) || word.includes(sw))) {
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

    // 检查考试时间
    const now = new Date();
    if (exam.endTime && now > exam.endTime) {
      throw new ConflictException('考试已结束，不能保存答案');
    }

    // 检查是否已经有正式提交的记录
    // 注意：正式提交不一定 `isAutoGraded === true`（存在主观题时会是 false），所以不能用它判断。
    const existingSubmission = await this.prisma.submission.findFirst({
      where: {
        examId,
        examStudentId,
        gradingDetails: { not: null },
      },
    });

    if (existingSubmission) {
      throw new ConflictException('考试已提交，不能再保存答案');
    }

    // 保存或更新草稿答案
    // 草稿：没有评分详情的记录（避免把主观题导致 isAutoGraded=false 的正式提交当成草稿）
    const existingDraft = await this.prisma.submission.findFirst({
      where: {
        examId,
        examStudentId,
        gradingDetails: null,
      },
    });

    if (existingDraft) {
      // 更新现有草稿
      await this.prisma.submission.update({
        where: { id: existingDraft.id },
        data: {
          answers: JSON.stringify(answers),
        },
      });
    } else {
      // 创建新的草稿记录
      await this.prisma.submission.create({
        data: {
          examId,
          examStudentId,
          answers: JSON.stringify(answers),
          isAutoGraded: false, // 标记为草稿
          isReviewed: false,
          gradingDetails: null,
        },
      });
    }

    return { message: '答案保存成功', timestamp: new Date() };
  }

  // 评分相关方法
  async getSubmissionDetails(examId: string, submissionId: string, currentUser: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
            },
          },
        },
        examStudent: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!submission || submission.examId !== examId) {
      throw new NotFoundException('提交记录不存在');
    }

    // 权限检查：只有管理员、教师（自己的考试）、学生本人可以查看
    if (currentUser.role !== 'ADMIN') {
      if (currentUser.role === 'TEACHER') {
        const examCreator = submission.exam.createdBy;
        if (examCreator && String(examCreator) !== String(currentUser.sub)) {
          console.warn(
            `[Permission Denied] View Submission ${submissionId}: ExamCreator=${examCreator}, User=${currentUser.sub}`
          );
          // 暂时放宽限制，只记录日志
          // throw new ForbiddenException('您只能查看自己创建的考试的提交记录');
        }
      } else if (currentUser.role === 'STUDENT' || currentUser.isStudent) {
        // 检查是否是学生本人的提交
        const isOwnSubmission =
          submission.examStudent.studentId === currentUser.sub ||
          submission.examStudent.student?.studentId === currentUser.username;
        if (!isOwnSubmission) {
          throw new ForbiddenException('您只能查看自己的提交记录');
        }
      } else {
        throw new ForbiddenException('您没有权限查看此提交记录');
      }
    }

    // 解析评分详情
    let gradingDetails = null;
    if (submission.gradingDetails) {
      try {
        gradingDetails = this.safeJsonParse(submission.gradingDetails);
      } catch (error) {
        console.error('解析评分详情失败:', error);
      }
    }

    return {
      id: submission.id,
      examId: submission.examId,
      score: submission.score,
      submittedAt: submission.submittedAt,
      isAutoGraded: submission.isAutoGraded,
      answers: this.parseSubmissionAnswersMap(submission.answers),
      answersArray: this.parseSubmissionAnswersArray(submission.answers),
      gradingDetails,
      exam: {
        id: submission.exam.id,
        title: submission.exam.title,
        totalScore: submission.exam.totalScore,
        questions: submission.exam.examQuestions.map((eq) => ({
          id: eq.question.id,
          content: eq.question.content,
          type: eq.question.type,
          options: eq.question.options,
          score: eq.score,
        })),
      },
    };
  }

  async getExamSubmissions(examId: string) {
    // 只返回正式提交：必须有 gradingDetails；否则会把自动保存草稿也展示到教师端
    const submissions = await this.prisma.submission.findMany({
      where: { examId, gradingDetails: { not: null } },
      include: {
        examStudent: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((submission) => {
      const answers = this.parseSubmissionAnswersMap(submission.answers);
      const answersArray = this.parseSubmissionAnswersArray(submission.answers);
      const gradingDetails = this.safeJsonParse(submission.gradingDetails);

      return {
        id: submission.id,
        student: {
          id: submission.examStudent?.id,
          username: submission.examStudent?.username,
          displayName: submission.examStudent?.displayName,
          accountType: submission.examStudent?.accountType,
        },
        answers,
        answersArray,
        score: submission.score,
        isAutoGraded: submission.isAutoGraded,
        isReviewed: submission.isReviewed,
        reviewedBy: submission.reviewedBy,
        reviewedAt: submission.reviewedAt,
        gradingDetails,
        submittedAt: submission.submittedAt,
      };
    });
  }

  async gradeSubmission(
    submissionId: string,
    scores: Record<string, number>,
    totalScore: number,
    reviewerId?: string,
    feedback?: string
  ) {
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
    const gradingDetails = this.safeJsonParse(submission.gradingDetails);

    if (!gradingDetails) {
      return {
        submissionId,
        suggestions: {},
        totalMaxScore: submission.exam.totalScore,
        preGradingInfo: null,
      };
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

  async batchApproveSubmissions(examId: string, submissionIds: string[], currentUser: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    if (currentUser.role !== 'ADMIN') {
      const examCreator = exam.createdBy;
      if (examCreator && String(examCreator) !== String(currentUser.sub)) {
        console.warn(
          `[Permission Denied] Batch Approve: ExamCreator=${examCreator}, User=${currentUser.sub}`
        );
        // 暂时放宽限制
        // throw new ForbiddenException('您没有权限复核此考试的提交记录');
      }
    }

    if (!submissionIds || submissionIds.length === 0) {
      throw new BadRequestException('submissionIds 不能为空');
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        id: { in: submissionIds },
        examId,
      },
      select: {
        id: true,
        score: true,
        gradingDetails: true,
        isReviewed: true,
        examStudent: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    const foundIdSet = new Set(submissions.map((s) => s.id));
    const notFoundSubmissionIds = submissionIds.filter((id) => !foundIdSet.has(id));

    const now = new Date();

    const approvedSubmissionIds: string[] = [];
    const approved: Array<{
      submissionId: string;
      student?: { username: string; displayName?: string | null };
    }> = [];
    const skipped: Array<{
      submissionId: string;
      reason: 'ALREADY_REVIEWED' | 'NO_SCORE';
      student?: { username: string; displayName?: string | null };
    }> = [];

    for (const submission of submissions) {
      const student = submission.examStudent
        ? {
            username: submission.examStudent.username,
            displayName: submission.examStudent.displayName,
          }
        : undefined;

      if (submission.isReviewed) {
        skipped.push({ submissionId: submission.id, reason: 'ALREADY_REVIEWED', student });
        continue;
      }

      const fallbackTotalScore = (() => {
        const parsed = this.safeJsonParse(submission.gradingDetails);
        const totalScore = parsed?.totalScore;
        return typeof totalScore === 'number' ? totalScore : null;
      })();

      const totalScore =
        submission.score !== null && submission.score !== undefined
          ? submission.score
          : fallbackTotalScore;

      if (totalScore === null) {
        skipped.push({ submissionId: submission.id, reason: 'NO_SCORE', student });
        continue;
      }

      approvedSubmissionIds.push(submission.id);
      approved.push({ submissionId: submission.id, student });
    }

    if (approvedSubmissionIds.length > 0) {
      await this.prisma.submission.updateMany({
        where: {
          id: { in: approvedSubmissionIds },
          examId,
        },
        data: {
          isReviewed: true,
          reviewedAt: now,
          reviewedBy: currentUser.sub,
        },
      });
    }

    return {
      approvedCount: approvedSubmissionIds.length,
      approvedSubmissionIds,
      approved,
      skippedCount: skipped.length,
      skipped,
      notFoundCount: notFoundSubmissionIds.length,
      notFoundSubmissionIds,
    };
  }

  async batchResetSubmissions(examId: string, submissionIds: string[], currentUser: any) {
    // 权限检查：只有管理员和考试创建者可以重置
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('考试不存在');
    }

    if (currentUser.role !== 'ADMIN') {
      const examCreator = exam.createdBy;
      if (examCreator && String(examCreator) !== String(currentUser.sub)) {
        console.warn(
          `[Permission Denied] Batch Reset: ExamCreator=${examCreator}, User=${currentUser.sub}`
        );
        // 暂时放宽限制
        // throw new ForbiddenException('您没有权限重置此考试的提交记录');
      }
    }

    // 删除选中的提交记录
    const result = await this.prisma.submission.deleteMany({
      where: {
        id: { in: submissionIds },
        examId: examId,
      },
    });

    return {
      message: `成功重置 ${result.count} 个学生的答题记录`,
      resetCount: result.count,
    };
  }

  private normalizeTrueFalseAnswer(answer: unknown): string {
    if (answer === true || answer === 'true' || answer === '正确' || answer === '对') {
      return '正确';
    }
    if (answer === false || answer === 'false' || answer === '错误' || answer === '错') {
      return '错误';
    }
    return answer ? String(answer) : '';
  }

  private convertAnswerToText(
    answer: string | null,
    options: string | null,
    questionType: string
  ): string | string[] {
    if (!answer) return '';

    if (questionType === 'TRUE_FALSE') {
      return this.normalizeTrueFalseAnswer(answer);
    }

    if (!options) return answer || '';

    try {
      const optionsArray = JSON.parse(options);
      if (!Array.isArray(optionsArray)) return answer;

      if (questionType === 'SINGLE_CHOICE') {
        if (answer.length === 1 && /[A-Z]/.test(answer)) {
          const index = answer.charCodeAt(0) - 65;
          const option = optionsArray[index];
          if (option) {
            return typeof option === 'object' ? option.content : option;
          }
        }
        return answer;
      } else if (questionType === 'MULTIPLE_CHOICE') {
        if (/^[A-Z]+$/.test(answer)) {
          const selectedOptions = [];
          for (let i = 0; i < answer.length; i++) {
            const index = answer.charCodeAt(i) - 65;
            const option = optionsArray[index];
            if (option) {
              const content = typeof option === 'object' ? option.content : option;
              selectedOptions.push(content);
            }
          }
          return selectedOptions;
        }
        return answer;
      }

      return answer;
    } catch (error) {
      return answer || '';
    }
  }

  private compareAnswers(studentAnswer: any, correctAnswer: any, questionType: string): boolean {
    if (!correctAnswer) return false;

    if (questionType === 'SINGLE_CHOICE') {
      let correctText = correctAnswer;
      if (typeof correctAnswer === 'object' && correctAnswer && correctAnswer.content) {
        correctText = correctAnswer.content;
      }
      return studentAnswer === correctText;
    } else if (questionType === 'TRUE_FALSE') {
      return (
        this.normalizeTrueFalseAnswer(studentAnswer) ===
        this.normalizeTrueFalseAnswer(correctAnswer)
      );
    } else if (questionType === 'MULTIPLE_CHOICE') {
      try {
        let correct = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

        if (
          correct.length > 0 &&
          typeof correct[0] === 'object' &&
          correct[0] &&
          correct[0].content
        ) {
          correct = correct.map((item: any) => item.content);
        }

        const student = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
        const sortedCorrect = JSON.stringify(correct.sort());
        const sortedStudent = JSON.stringify(student.sort());

        return sortedCorrect === sortedStudent;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  private gradeMatchingAnswer(
    studentAnswer: any,
    correctAnswer: string | null | undefined,
    maxScore: number
  ) {
    const correctPairs = this.parseMatchingPairs(correctAnswer);
    const studentPairs = this.parseMatchingPairs(studentAnswer);

    if (correctPairs.length === 0) {
      return {
        score: 0,
        isFullyCorrect: false,
        correctCount: 0,
        totalCount: 0,
        feedback: '未提供正确答案',
      };
    }

    const totalCount = correctPairs.length;
    const correctCount = correctPairs.filter((pair) =>
      studentPairs.some(
        (studentPair) => studentPair.left === pair.left && studentPair.right === pair.right
      )
    ).length;

    const ratio = correctCount / totalCount;
    const score = Math.round(maxScore * ratio * 100) / 100;
    const isFullyCorrect = correctCount === totalCount;

    return {
      score,
      isFullyCorrect,
      correctCount,
      totalCount,
      feedback: isFullyCorrect
        ? '答案正确'
        : `正确 ${correctCount}/${totalCount}，得分 ${score}/${maxScore}`,
    };
  }

  private parseMatchingPairs(answer: any) {
    if (!answer) return [] as Array<{ left: string; right: string }>;
    if (Array.isArray(answer)) {
      return answer
        .map((pair) => ({ left: String(pair.left || ''), right: String(pair.right || '') }))
        .filter((pair) => pair.left && pair.right);
    }
    if (typeof answer === 'string') {
      try {
        const parsed = JSON.parse(answer);
        if (Array.isArray(parsed)) {
          return parsed
            .map((pair) => ({ left: String(pair.left || ''), right: String(pair.right || '') }))
            .filter((pair) => pair.left && pair.right);
        }
        if (parsed && typeof parsed === 'object') {
          const matches = (parsed as { matches?: Record<string, string> }).matches || {};
          return Object.entries(matches).map(([left, right]) => ({
            left: String(left),
            right: String(right),
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
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
  async importStudentsFromClass(examId: string, classId: string, studentIds?: string[]) {
    await this.findById(examId);

    const whereClause: any = { classId };
    if (studentIds && studentIds.length > 0) {
      whereClause.id = { in: studentIds };
    }

    const students = await this.prisma.student.findMany({
      where: whereClause,
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
  async importTemporaryStudents(
    examId: string,
    studentsData: Array<{ name: string; username?: string }>,
    customPassword?: string
  ) {
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
          const password = customPassword || AccountGenerator.generateMemorablePassword();
          const examStudent = await this.prisma.examStudent.create({
            data: {
              examId,
              username: fallbackUsername,
              password: await bcrypt.hash(password, 10),
              displayName: studentData.name,
              accountType: 'TEMPORARY_IMPORT',
            },
          });

          results.push({
            ...examStudent,
            plainPassword: password,
          });
          continue;
        }

        const password = customPassword || AccountGenerator.generateMemorablePassword();
        const examStudent = await this.prisma.examStudent.create({
          data: {
            examId,
            username,
            password: await bcrypt.hash(password, 10),
            displayName: studentData.name,
            accountType: 'TEMPORARY_IMPORT',
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

    console.log(`考试分析: Exam ID: ${examId}`);
    console.log(
      `总学生数: ${totalStudents}, 已提交: ${submittedCount}, 未提交: ${notSubmittedCount}`
    );
    console.log(
      `提交记录:`,
      submissions.map((s) => ({ id: s.id, studentId: s.examStudentId, score: s.score }))
    );

    // 成绩统计
    const scores = submissions.map((s) => s.score).filter((s) => s !== null);
    console.log(`学生成绩列表:`, scores);
    const scoreStats = {
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
      passRate:
        scores.length > 0 ? (scores.filter((s) => s >= 60).length / scores.length) * 100 : 0,
    };
    console.log(
      `成绩统计: 平均分=${scoreStats.average}, 最高分=${scoreStats.highest}, 最低分=${scoreStats.lowest}, 及格率=${scoreStats.passRate}%`
    );

    // 题目分析
    console.log(`开始题目分析，共${exam.examQuestions.length}道题`);
    const questionStats = [];
    for (const examQuestion of exam.examQuestions) {
      console.log(
        `  处理题目: ID=${examQuestion.question.id}, 类型=${examQuestion.question.type}, 分值=${examQuestion.score}, 内容="${examQuestion.question.content.substring(0, 50)}..."`
      );

      const questionAnswers = [];

      for (const submission of submissions) {
        if (submission.answers) {
          const answersObj = Object.fromEntries(
            this.parseSubmissionAnswersArray(submission.answers).map((a: any) => [
              a.questionId,
              a.answer,
            ])
          );
          const answer = answersObj[examQuestion.question.id];
          if (answer !== undefined) {
            const gradingDetails = this.safeJsonParse(submission.gradingDetails) || {};
            // 评分数据结构是 { details: { questionId: { score, maxScore, feedback }, ... } }
            const questionScore = gradingDetails.details?.[examQuestion.question.id]?.score;
            // 如果没有找到该题的评分，尝试从submission.score按比例计算
            let score = 0;
            if (questionScore !== undefined) {
              score = questionScore;
            } else {
              console.log(
                `    警告: 提交ID=${submission.id}中未找到题目${examQuestion.question.id}的具体评分，gradingDetails结构:`,
                gradingDetails
              );
              // 如果没有具体的题目评分，暂时记为0分
              score = 0;
            }

            questionAnswers.push({
              answer: answer,
              score: score,
              maxScore: examQuestion.score,
            });
            console.log(
              `    提交ID=${submission.id}, 学生ID=${submission.examStudentId}, 得分=${score}/${examQuestion.score}`
            );
          }
        }
      }

      // 改进正确率计算逻辑：对于客观题（单选、多选、判断），使用完全正确；对于主观题，使用得分率大于等于60%
      const isObjectiveQuestion = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(
        examQuestion.question.type
      );

      let correctAnswers = 0;
      if (isObjectiveQuestion) {
        // 对于客观题，只有完全答对才算正确
        correctAnswers = questionAnswers.filter((qa) => qa.score === qa.maxScore).length;
      } else {
        // 对于主观题，得分率大于等于60%算作正确
        correctAnswers = questionAnswers.filter((qa) => qa.score >= qa.maxScore * 0.6).length;
      }

      const correctRate =
        questionAnswers.length > 0 ? (correctAnswers / questionAnswers.length) * 100 : 0;
      const averageScore =
        questionAnswers.length > 0
          ? questionAnswers.reduce((sum, qa) => sum + qa.score, 0) / questionAnswers.length
          : 0;

      console.log(
        `    题目统计: 参与答题学生=${questionAnswers.length}, 正确率=${correctRate}%, 平均分=${averageScore}`
      );

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
    console.log(`题目分析完成，共统计${questionStats.length}道题`);

    // 知识点分析
    console.log(`开始知识点分析`);
    const knowledgePointMap = new Map();

    // 初始化知识点映射
    questionStats.forEach((qs) => {
      const kp = qs.knowledgePoint || '未分类';
      if (!knowledgePointMap.has(kp)) {
        knowledgePointMap.set(kp, {
          knowledgePoint: kp,
          questionCount: 0,
          questionScores: [], // 存储该知识点下每道题的平均分
          submissionsForMastery: [], // 记录每个学生的掌握情况
        });
      }

      const kpData = knowledgePointMap.get(kp);
      kpData.questionCount++;
      // 将该题目的平均分添加到知识点的分数列表中
      kpData.questionScores.push(qs.averageScore);
    });

    console.log(`知识点分组完成:`, Array.from(knowledgePointMap.keys()));

    // 计算每个学生的知识点掌握情况
    submissions.forEach((submission) => {
      if (submission.answers) {
        const answers = Object.fromEntries(
          this.parseSubmissionAnswersArray(submission.answers).map((a: any) => [
            a.questionId,
            a.answer,
          ])
        );

        // 对于每个知识点，检查该学生是否掌握了该知识点下的大部分题目
        knowledgePointMap.forEach((kpData, kp) => {
          const kpQuestions = questionStats.filter((qs) => (qs.knowledgePoint || '未分类') === kp);

          if (kpQuestions.length > 0) {
            let masteredQuestions = 0;
            console.log(`  检查学生 ${submission.examStudentId} 对知识点 "${kp}" 的掌握情况`);

            kpQuestions.forEach((qs) => {
              if (answers[qs.questionId]) {
                // 获取该题目的得分
                const gradingDetails = this.safeJsonParse(submission.gradingDetails) || {};
                // 评分数据结构是 { details: { questionId: { score, maxScore, feedback }, ... } }
                const questionScore = gradingDetails.details?.[qs.questionId]?.score || 0;
                const maxScore =
                  exam.examQuestions.find((eq) => eq.question.id === qs.questionId)?.score || 1;

                console.log(
                  `    题目 "${qs.content.substring(0, 30)}...", 得分: ${questionScore}/${maxScore}, 掌握: ${questionScore / maxScore >= 0.7 ? '是' : '否'}`
                );

                // 如果得分率达到一定比例（例如70%），认为该题被掌握
                if (questionScore / maxScore >= 0.7) {
                  masteredQuestions++;
                }
              }
            });

            console.log(
              `    知识点 "${kp}" 下共 ${kpQuestions.length} 题，掌握 ${masteredQuestions} 题`
            );

            // 如果学生掌握了该知识点下超过一半的题目，则认为该学生掌握了该知识点
            if (masteredQuestions > kpQuestions.length / 2) {
              kpData.submissionsForMastery.push(submission.id);
              console.log(`    学生 ${submission.examStudentId} 掌握了知识点 "${kp}"`);
            } else {
              console.log(`    学生 ${submission.examStudentId} 未掌握知识点 "${kp}"`);
            }
          }
        });
      }
    });

    console.log(`知识点掌握情况统计:`);
    knowledgePointMap.forEach((kpData, kp) => {
      const avgScore =
        kpData.questionScores.length > 0
          ? kpData.questionScores.reduce((sum, score) => sum + score, 0) /
            kpData.questionScores.length
          : 0;
      console.log(
        `  知识点 "${kp}": 共 ${kpData.questionCount} 题, 平均分 ${avgScore}, ${kpData.submissionsForMastery.length}/${submissions.length} 学生掌握`
      );
    });

    const knowledgePointStats = Array.from(knowledgePointMap.values()).map((kp) => ({
      knowledgePoint: kp.knowledgePoint,
      questionCount: kp.questionCount,
      averageScore:
        kp.questionScores.length > 0
          ? kp.questionScores.reduce((sum, score) => sum + score, 0) / kp.questionScores.length
          : 0,
      masteryRate:
        submissions.length > 0 ? (kp.submissionsForMastery.length / submissions.length) * 100 : 0,
    }));

    // 参与情况统计
    const participationStats = {
      totalStudents,
      submittedCount,
      notSubmittedCount,
      participationRate: totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0,
    };

    const studentNameById = new Map(
      exam.examStudents.map((s: any) => [s.id, s.displayName || s.username || s.studentId || s.id])
    );

    const heatmapStudents = submissions.map((s) => ({
      id: s.examStudentId,
      name: studentNameById.get(s.examStudentId) || s.examStudentId,
    }));

    const heatmapQuestions = exam.examQuestions
      .slice()
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((eq: any) => ({
        id: eq.question.id,
        order: eq.order ?? 0,
        score: eq.score,
      }));

    const heatmapValues = submissions.map((submission) => {
      const gradingDetails = this.safeJsonParse(submission.gradingDetails) || {};
      const detailByQuestionId = gradingDetails.details || {};

      return heatmapQuestions.map((q) => {
        const score = detailByQuestionId?.[q.id]?.score;
        return typeof score === 'number' ? score : 0;
      });
    });

    const heatmapMastery = heatmapQuestions.map((q, questionIndex) => {
      if (submissions.length === 0) {
        return {
          questionId: q.id,
          order: q.order,
          averageScore: 0,
          maxScore: q.score,
          masteryRate: 0,
        };
      }

      const totalScore = heatmapValues.reduce((sum, row) => sum + (row?.[questionIndex] ?? 0), 0);
      const averageScore = totalScore / submissions.length;
      const maxScore = q.score || 0;
      const masteryRate = maxScore > 0 ? (averageScore / maxScore) * 100 : 0;

      return {
        questionId: q.id,
        order: q.order,
        averageScore,
        maxScore,
        masteryRate,
      };
    });

    return {
      scoreStats,
      scores,
      questionStats,
      knowledgePointStats,
      participationStats,
      heatmap: {
        students: heatmapStudents,
        questions: heatmapQuestions,
        values: heatmapValues,
        mastery: heatmapMastery,
      },
    };
  }

  /**
   * 获取已保存的AI分析报告
   */
  async getSavedAIReport(examId: string, currentUser: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        aiAnalysisReport: true,
        aiAnalysisStatus: true,
        aiAnalysisModel: true,
        aiAnalysisUpdatedAt: true,
        createdBy: true,
      },
    });

    if (!exam) {
      throw new Error('考试不存在');
    }

    // 调试日志
    console.log(
      `[getSavedAIReport] ExamId=${examId}, User=${currentUser.sub}, Role=${currentUser.role}, Creator=${exam.createdBy}`
    );

    // 权限检查
    if (currentUser.role === 'ADMIN') {
      // 管理员可以访问所有考试
    } else if (currentUser.role === 'TEACHER') {
      // 教师可以访问所有考试，但只能查看
      // 原来的逻辑限制了教师只能访问自己创建的考试，这里放宽限制
      // 如果需要恢复严格限制，可以取消注释下面的代码
      /*
      if (exam.createdBy !== currentUser.sub) {
        throw new Error('您没有权限访问此考试');
      }
      */
    } else if (currentUser.role === 'STUDENT' || currentUser.isStudent) {
      // 学生只能访问自己参与的考试
      const examStudent = await this.prisma.examStudent.findFirst({
        where: {
          examId: examId,
          OR: [
            { studentId: currentUser.sub }, // 固定学生
            { student: { studentId: currentUser.username } }, // 临时学生
          ],
        },
      });
      if (!examStudent) {
        throw new Error('您没有权限访问此考试');
      }
    } else {
      throw new Error('无效的用户角色');
    }

    return {
      examId: exam.id,
      examTitle: exam.title,
      report: exam.aiAnalysisReport,
      status: exam.aiAnalysisStatus,
      model: exam.aiAnalysisModel,
      generatedAt: exam.aiAnalysisUpdatedAt,
      hasReport: !!exam.aiAnalysisReport,
    };
  }

  async generateAIReportStream(examId: string, data: any, userId?: string, res?: any) {
    try {
      // 发送开始信号
      res.write(`data: ${JSON.stringify({ type: 'start', message: '开始生成AI分析报告...' })}\n\n`);

      // 获取考试数据和分析数据
      res.write(
        `data: ${JSON.stringify({ type: 'progress', message: '正在获取考试数据...' })}\n\n`
      );

      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: {
          examQuestions: {
            include: {
              question: true,
            },
          },
        },
      });

      if (!exam) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '考试不存在' })}\n\n`);
        res.end();
        return;
      }

      const analytics = await this.getExamAnalytics(examId);

      // 获取用户的默认AI Provider设置
      res.write(`data: ${JSON.stringify({ type: 'progress', message: '正在获取AI配置...' })}\n\n`);

      // 使用 SettingsService 中统一的逻辑来获取活动的AI Provider
      let providerInfo;
      try {
        providerInfo = await this.settingsService.getActiveAIProvider(userId);
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: '获取AI Provider配置失败: ' + error.message })}\n\n`
        );
        res.end();
        return;
      }

      // 如果 providerInfo 包含 id，说明是自定义 provider，需要从数据库获取详细信息
      let aiProvider;
      if (providerInfo.id) {
        aiProvider = await this.prisma.aIProvider.findUnique({
          where: { id: providerInfo.id, isActive: true },
        });
      } else {
        // 如果没有 id，说明是系统默认 provider，需要从用户设置获取详细信息
        const userSettings = await this.prisma.userSetting.findMany({
          where: { userId: userId },
        });
        const settingsMap = new Map(userSettings.map((s) => [s.key, s.value]));

        // 获取系统设置
        const systemSettings = await this.settingsService.getSettings();

        // 构造 provider 对象
        aiProvider = {
          id: null,
          name: providerInfo.name,
          provider: providerInfo.provider,
          model: settingsMap.get('AI_MODEL') || systemSettings.aiModel,
          baseUrl: settingsMap.get('AI_BASE_URL') || systemSettings.aiBaseUrl,
          apiKey: settingsMap.get('AI_API_KEY') || systemSettings.aiApiKey,
          isGlobal: true,
        };
      }

      if (!aiProvider) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: '未找到可用的AI Provider，请先在设置页面配置AI服务' })}\n\n`
        );
        res.end();
        return;
      }

      // 构建分析报告的提示词
      res.write(
        `data: ${JSON.stringify({ type: 'progress', message: '正在构建分析提示词...' })}\n\n`
      );
      const prompt = await this.buildAnalysisPrompt(exam, analytics, userId);

      // 调用AI服务生成报告
      res.write(
        `data: ${JSON.stringify({ type: 'progress', message: '正在调用AI服务生成报告...' })}\n\n`
      );
      const report = await this.callAIServiceStream(aiProvider, prompt, res);

      // 保存报告到数据库
      res.write(
        `data: ${JSON.stringify({ type: 'progress', message: '正在保存分析报告...' })}\n\n`
      );
      const now = new Date();
      await this.prisma.exam.update({
        where: { id: examId },
        data: {
          aiAnalysisReport: report,
          aiAnalysisStatus: 'COMPLETED',
          aiAnalysisPromptUsed: prompt,
          aiAnalysisProviderId: aiProvider.id,
          aiAnalysisModel: aiProvider.model,
          aiAnalysisUpdatedAt: now,
        },
      });

      // 发送完成信号，包含生成时间
      res.write(
        `data: ${JSON.stringify({ type: 'complete', report: report, model: aiProvider.model, generatedAt: now.toISOString() })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error('生成AI报告失败:', error);
      // 更新状态为失败
      await this.prisma.exam
        .update({
          where: { id: examId },
          data: {
            aiAnalysisStatus: 'FAILED',
            aiAnalysisUpdatedAt: new Date(),
          },
        })
        .catch(() => {}); // 忽略更新失败的错误
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: `生成AI分析报告失败: ${error.message}` })}\n\n`
      );
      res.end();
    }
  }

  private async buildAnalysisPrompt(exam: any, analytics: any, userId?: string): Promise<string> {
    // 获取用户自定义的分析提示词模板
    let promptTemplate = '';

    if (userId) {
      const userSetting = await this.prisma.userSetting.findFirst({
        where: {
          userId: userId,
          key: 'ANALYSIS_PROMPT_TEMPLATE',
        },
      });
      promptTemplate = userSetting?.value || '';
    }

    // 如果用户没有自定义模板，使用系统默认模板
    if (!promptTemplate) {
      promptTemplate = `请基于以下考试数据生成一份详细的分析报告：

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

请用中文回答，内容要专业、详细、有针对性。`;
    }

    // 替换变量
    const questionStatsText =
      analytics.questionStats
        ?.map(
          (q: any, index: number) =>
            `第${index + 1}题 - 正确率：${q.correctRate?.toFixed(1) || 0}%，平均得分：${q.averageScore?.toFixed(1) || 0}分`
        )
        .join('\n') || '无题目数据';

    const knowledgePointStatsText =
      analytics.knowledgePointStats
        ?.map(
          (kp: any) =>
            `${kp.knowledgePoint || '未分类'} - 掌握率：${kp.masteryRate?.toFixed(1) || 0}%，平均得分：${kp.averageScore?.toFixed(1) || 0}分`
        )
        .join('\n') || '无知识点数据';

    return promptTemplate
      .replace(/{examTitle}/g, exam.title || '')
      .replace(/{examDescription}/g, exam.description || '无')
      .replace(/{duration}/g, exam.duration?.toString() || '0')
      .replace(/{totalScore}/g, exam.totalScore?.toString() || '0')
      .replace(/{questionCount}/g, exam.examQuestions?.length?.toString() || '0')
      .replace(/{averageScore}/g, analytics.scoreStats?.average?.toFixed(1) || '0')
      .replace(/{highestScore}/g, analytics.scoreStats?.highest?.toString() || '0')
      .replace(/{lowestScore}/g, analytics.scoreStats?.lowest?.toString() || '0')
      .replace(/{passRate}/g, analytics.scoreStats?.passRate?.toFixed(1) || '0')
      .replace(/{submittedCount}/g, analytics.participationStats?.submittedCount?.toString() || '0')
      .replace(
        /{participationRate}/g,
        analytics.participationStats?.participationRate?.toFixed(1) || '0'
      )
      .replace(/{questionStats}/g, questionStatsText)
      .replace(/{knowledgePointStats}/g, knowledgePointStatsText);
  }

  private async callAIServiceStream(aiProvider: any, prompt: string, res: any): Promise<string> {
    const apiKey = aiProvider.apiKey;
    const baseUrl = aiProvider.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = aiProvider.model || 'qwen-turbo';

    console.log('调用AI服务:', { baseUrl, model, hasApiKey: !!apiKey });

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
          stream: true, // 启用流式响应
        }),
      });

      console.log('AI服务响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI服务错误响应:', errorText);
        throw new Error(`AI服务调用失败: ${response.status} ${response.statusText}`);
      }

      let fullReport = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullReport += content;
                  // 发送流式内容
                  res.write(`data: ${JSON.stringify({ type: 'stream', content: content })}\n\n`);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

      return fullReport || '生成报告失败';
    } catch (error) {
      console.error('AI服务调用异常:', error);
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
  }

  // 辅助方法：生成PDF报告
  private async generatePdfReport(
    doc: InstanceType<typeof PDFDocument>,
    exam: any,
    analytics: any
  ): Promise<void> {
    // 注册字体
    const fontCandidates = [
      path.join(process.cwd(), 'apps', 'api', 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
      path.join(process.cwd(), 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
      path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
    ];

    const fontPath = fontCandidates.find((candidate) => fs.existsSync(candidate));

    if (fontPath) {
      doc.font(fontPath);
    } else {
      doc.font('Helvetica');
      doc
        .fillColor('red')
        .fontSize(10)
        .text('注意：缺少中文字体（LXGWWenKai-Regular.ttf），中文内容可能无法正确显示。', {
          align: 'center',
        });
      doc.fillColor('black');
      doc.moveDown();
    }

    doc.fontSize(24).text(`${exam.title} - 考试分析报告`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`考试时间: ${new Date().toLocaleDateString()}`);
    doc.text(`总分: ${exam.totalScore}`);
    doc.moveDown();

    if (exam.aiAnalysisReport) {
      doc.fontSize(16).text('AI 智能分析');
      doc.moveDown();
      doc.fontSize(12).text(exam.aiAnalysisReport);
      doc.moveDown();
      doc.addPage();
    }

    // 统计概览
    if (analytics) {
      doc.fontSize(16).text('统计概览');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`平均分: ${analytics.scoreStats?.average?.toFixed(1) || 0}`);
      doc.text(`及格率: ${analytics.scoreStats?.passRate?.toFixed(1) || 0}%`);
      doc.text(`最高分: ${analytics.scoreStats?.highest || 0}`);
      doc.text(`最低分: ${analytics.scoreStats?.lowest || 0}`);
      doc.moveDown();

      // 添加图表
      this.drawAnalyticsCharts(doc, exam, analytics);
      doc.addPage();
    }

    // 题目详情
    doc.fontSize(16).text('题目详情');
    doc.moveDown();
    exam.examQuestions.forEach((eq: any, index: number) => {
      doc.fontSize(14).text(`第 ${index + 1} 题 (${eq.score}分)`);
      doc.fontSize(12).text(`题目: ${eq.question.content}`);
      doc.text(`类型: ${eq.question.type}`);
      doc.text(`难度: ${eq.question.difficulty}`);
      if (eq.question.answer) {
        doc.text(`答案: ${eq.question.answer}`);
      }
      doc.moveDown();
    });
  }

  private drawAnalyticsCharts(doc: any, exam: any, analytics: any) {
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    let currentY = doc.y;

    // 1. 分数分布 (柱状图)
    if (exam.submissions && exam.submissions.length > 0) {
      const scores = exam.submissions.map((s: any) => s.score || 0);
      const ranges = [
        { name: '0-20', min: 0, max: 20 },
        { name: '21-40', min: 21, max: 40 },
        { name: '41-60', min: 41, max: 60 },
        { name: '61-80', min: 61, max: 80 },
        { name: '81-100', min: 81, max: 100 },
      ];
      const data = ranges.map((r) => ({
        label: r.name,
        value: scores.filter((s) => s >= r.min && s <= r.max).length,
      }));

      this.drawBarChart(doc, margin, currentY, contentWidth, 200, data, '分数分布');
      currentY += 240;
    }

    // 检查是否需要新页
    if (currentY > doc.page.height - 250) {
      doc.addPage();
      currentY = margin;
    }

    // 2. 题型分布 (饼图)
    const typeCount: Record<string, number> = {};
    exam.examQuestions.forEach((eq: any) => {
      const type = eq.question.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const pieData = Object.entries(typeCount).map(([k, v]) => ({ label: k, value: v }));

    // 左右布局：左边题型分布，右边难度分布
    this.drawPieChart(doc, margin + 80, currentY + 100, 70, pieData, '题型分布');

    // 3. 难度分布 (柱状图)
    const diffCount: Record<string, number> = {};
    exam.examQuestions.forEach((eq: any) => {
      const d = eq.question.difficulty || '未设置';
      diffCount[d] = (diffCount[d] || 0) + 1;
    });
    const diffData = Object.entries(diffCount).map(([k, v]) => ({ label: k, value: v }));
    this.drawBarChart(
      doc,
      margin + 250,
      currentY,
      contentWidth / 2 - 20,
      200,
      diffData,
      '难度分布'
    );

    currentY += 240;

    // 检查是否需要新页
    if (currentY > doc.page.height - 250) {
      doc.addPage();
      currentY = margin;
    }

    // 4. 知识点掌握情况 (雷达图/柱状图) - 这里使用横向柱状图代替雷达图，因为PDF中更容易实现且清晰
    if (analytics.knowledgePointStats && analytics.knowledgePointStats.length > 0) {
      const kpData = analytics.knowledgePointStats.map((kp: any) => ({
        label: kp.knowledgePoint || '未分类',
        value: kp.masteryRate || 0,
      }));
      this.drawBarChart(
        doc,
        margin,
        currentY,
        contentWidth,
        200,
        kpData,
        '知识点掌握率 (%)',
        '#8b5cf6'
      );
    }
  }

  private drawBarChart(
    doc: any,
    x: number,
    y: number,
    w: number,
    h: number,
    data: any[],
    title: string,
    color: string = '#3b82f6'
  ) {
    doc.save();

    // 标题
    doc.fillColor('black').fontSize(12).text(title, x, y, { width: w, align: 'center' });

    const chartTop = y + 30;
    const chartHeight = h - 50;
    const chartBottom = chartTop + chartHeight;
    const barWidth = (w - 40) / data.length / 2;
    const gap = barWidth;

    // 坐标轴
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(x + 20, chartTop)
      .lineTo(x + 20, chartBottom) // Y轴
      .lineTo(x + w, chartBottom) // X轴
      .stroke();

    const maxValue = Math.max(...data.map((d) => d.value), 1); // 避免除以0

    // 绘制柱子
    data.forEach((d, i) => {
      const barHeight = (d.value / maxValue) * chartHeight;
      const barX = x + 30 + i * (barWidth + gap);
      const barY = chartBottom - barHeight;

      doc.fillColor(color).rect(barX, barY, barWidth, barHeight).fill();

      // 数值
      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .text(d.value.toString(), barX, barY - 12, { width: barWidth, align: 'center' });

      // 标签（X轴）
      doc
        .fillColor('black')
        .fontSize(8)
        .text(d.label, barX - 10, chartBottom + 5, { width: barWidth + 20, align: 'center' });
    });

    doc.restore();
  }

  private drawPieChart(doc: any, cx: number, cy: number, r: number, data: any[], title: string) {
    doc.save();

    // 标题
    doc
      .fillColor('black')
      .fontSize(12)
      .text(title, cx - r, cy - r - 25, { width: r * 2, align: 'center' });

    const total = data.reduce((sum, d) => sum + d.value, 0);
    let startAngle = 0;
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      const color = colors[i % colors.length];

      doc
        .fillColor(color)
        .path(
          `M ${cx} ${cy} L ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 ${sliceAngle > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(startAngle + sliceAngle)} ${cy + r * Math.sin(startAngle + sliceAngle)} Z`
        )
        .fill();

      // 图例
      const legendX = cx + r + 20;
      const legendY = cy - r + i * 15;
      doc.rect(legendX, legendY, 10, 10).fill();
      doc
        .fillColor('black')
        .fontSize(8)
        .text(`${d.label} (${((d.value / total) * 100).toFixed(0)}%)`, legendX + 15, legendY);

      startAngle += sliceAngle;
    });

    doc.restore();
  }

  private async generateStudentPdfReport(
    doc: InstanceType<typeof PDFDocument>,
    studentReport: any,
    exam: any
  ): Promise<void> {
    const fontCandidates = [
      path.join(process.cwd(), 'apps', 'api', 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
      path.join(process.cwd(), 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
      path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'LXGWWenKai-Regular.ttf'),
    ];

    const fontPath = fontCandidates.find((candidate) => fs.existsSync(candidate));

    if (fontPath) {
      doc.font(fontPath);
    } else {
      doc.font('Helvetica');
      doc
        .fillColor('red')
        .fontSize(10)
        .text('注意：缺少中文字体（LXGWWenKai-Regular.ttf），中文内容可能无法正确显示。', {
          align: 'center',
        });
      doc.fillColor('black');
      doc.moveDown();
    }

    const studentName =
      studentReport.examStudent?.student?.name ||
      studentReport.examStudent?.displayName ||
      studentReport.examStudent?.username ||
      '未知学生';

    doc.fontSize(24).text(`${studentName} - 个人考试分析报告`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`考试: ${exam.title}`);
    doc.text(`生成时间: ${studentReport.createdAt.toLocaleDateString()}`);
    doc.moveDown();

    if (studentReport.report) {
      doc.fontSize(16).text('AI 分析报告');
      doc.moveDown();
      doc.fontSize(12).text(studentReport.report);
    } else {
      doc.fontSize(12).text('暂无AI分析报告');
    }

    if (studentReport.errorMessage) {
      doc.moveDown();
      doc.fontSize(12).fillColor('red').text(`错误信息: ${studentReport.errorMessage}`);
      doc.fillColor('black');
    }
  }

  async exportExam(examId: string, res: Response, query?: any) {
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    console.log(`[exam-export] start examId=${examId} db=${dbUrl ?? 'unknown'}`);
    const tempDir = path.join(process.cwd(), 'temp', 'exports', examId);
    const downloadFileName = `exam_export_${examId}_${Date.now()}.zip`;
    const zipFilePath = path.join(process.cwd(), 'temp', 'downloads', downloadFileName);

    const exportZipRetentionMinutes = Number(
      this.configService.get<string>('EXAM_EXPORT_ZIP_RETENTION_MINUTES') ?? '30'
    );
    const exportZipRetentionMs = Number.isFinite(exportZipRetentionMinutes)
      ? Math.max(1, exportZipRetentionMinutes) * 60_000
      : 30 * 60_000;

    const parseBoolean = (value: unknown, defaultValue: boolean) => {
      if (value === undefined || value === null) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
      }
      return defaultValue;
    };

    const exportOptions = {
      includeGrades: parseBoolean(query?.includeGrades, true),
      includeQuestions: parseBoolean(query?.includeQuestions, true),
      includeRawJson: parseBoolean(query?.includeRawJson, true),
      includeExamAiPdf: parseBoolean(query?.includeExamAiPdf, true),
      includeStudentAiPdfs: parseBoolean(query?.includeStudentAiPdfs, true),
    };

    if (Object.values(exportOptions).every((v) => !v)) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: '请至少选择一个导出内容' })}\n\n`
      );
      res.end();
      return;
    }

    // 确保目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const downloadsDir = path.dirname(zipFilePath);
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const sendProgress = (
      percentage: number,
      step: string,
      message?: string,
      meta?: Record<string, unknown>
    ) => {
      const payload = {
        type: 'progress',
        percentage,
        step,
        message: message ?? step,
        meta,
      };
      res.write(`data: ${JSON.stringify(payload, null, 0)}\n\n`);
      console.log(`[exam-export] progress ${percentage}% step=${step} msg=${payload.message}`);
    };

    try {
      // 1. 获取数据 (10%)
      sendProgress(10, 'fetching', '正在获取考试数据...');

      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: {
          examQuestions: { include: { question: true }, orderBy: { order: 'asc' } },
          examStudents: {
            include: {
              student: true,
              submissions: {
                where: { examId },
                orderBy: { submittedAt: 'desc' },
                take: 1,
              },
            },
          },
          submissions: { include: { examStudent: true } },
        },
      });

      if (!exam) {
        throw new NotFoundException('考试不存在或已删除');
      }

      const analytics = await this.getExamAnalytics(examId);

      // 2. 生成导出文件 (20% ~ 80%)
      const rawDataDir = path.join(tempDir, '原始数据');
      if (!fs.existsSync(rawDataDir)) {
        fs.mkdirSync(rawDataDir, { recursive: true });
      }

      if (exportOptions.includeGrades) {
        sendProgress(20, 'grades', '正在生成成绩册...');

        const gradeData = exam.examStudents.map((es: any) => {
          const submission = es.submissions[0];
          return {
            学生姓名: es.student?.name || es.displayName || es.username,
            '学号/用户名': es.student?.studentId || es.username,
            账号类型: es.accountType,
            成绩: submission ? submission.score : '未提交',
            提交状态: submission ? '已提交' : '未提交',
            提交时间: submission ? submission.submittedAt.toLocaleString() : '-',
            是否自动评分: submission ? (submission.isAutoGraded ? '是' : '否') : '-',
            是否已复核: submission ? (submission.isReviewed ? '是' : '否') : '-',
          };
        });

        const gradeWorkbook = XLSX.utils.book_new();
        const gradeWorksheet = XLSX.utils.json_to_sheet(gradeData);
        XLSX.utils.book_append_sheet(gradeWorkbook, gradeWorksheet, '成绩册');

        const gradesDir = path.join(tempDir, '成绩册');
        if (!fs.existsSync(gradesDir)) {
          fs.mkdirSync(gradesDir, { recursive: true });
        }
        XLSX.writeFile(gradeWorkbook, path.join(gradesDir, '成绩册.xlsx'));
      }

      if (exportOptions.includeQuestions) {
        sendProgress(25, 'questions', '正在生成题目明细...');

        const questionData = exam.examQuestions.map((eq: any) => ({
          序号: eq.order,
          题型: eq.question.type,
          内容: eq.question.content,
          选项: eq.question.options,
          答案: eq.question.answer,
          分值: eq.score,
          难度: eq.question.difficulty,
          解析: eq.question.explanation,
        }));

        const questionWorkbook = XLSX.utils.book_new();
        const questionWorksheet = XLSX.utils.json_to_sheet(questionData);
        XLSX.utils.book_append_sheet(questionWorkbook, questionWorksheet, '考试题目');

        XLSX.writeFile(questionWorkbook, path.join(rawDataDir, '考试题目.xlsx'));
      }

      if (exportOptions.includeRawJson) {
        sendProgress(30, 'raw-json', '正在生成 JSON 数据...');
        fs.writeFileSync(path.join(rawDataDir, 'exam_data.json'), JSON.stringify(exam, null, 2));
      }

      if (exportOptions.includeExamAiPdf) {
        sendProgress(40, 'exam-ai-pdf', '正在生成考试AI分析 PDF...');

        const aiDir = path.join(tempDir, 'AI分析');
        if (!fs.existsSync(aiDir)) {
          fs.mkdirSync(aiDir, { recursive: true });
        }

        const examPdfPath = path.join(aiDir, '考试AI分析.pdf');
        const examPdfDoc = new PDFDocument();
        const examPdfStream = fs.createWriteStream(examPdfPath);
        examPdfDoc.pipe(examPdfStream);
        await this.generatePdfReport(examPdfDoc, exam, analytics);

        await new Promise<void>((resolve, reject) => {
          examPdfStream.on('finish', resolve);
          examPdfStream.on('error', reject);
          examPdfDoc.on('error', reject);
          examPdfDoc.end();
        });
      }

      if (exportOptions.includeStudentAiPdfs) {
        sendProgress(50, 'student-ai-pdfs', '正在生成学生个人AI分析...');

        const aiDir = path.join(tempDir, 'AI分析');
        if (!fs.existsSync(aiDir)) {
          fs.mkdirSync(aiDir, { recursive: true });
        }

        const studentReportsDir = path.join(aiDir, '学生个人AI分析');
        if (!fs.existsSync(studentReportsDir)) {
          fs.mkdirSync(studentReportsDir, { recursive: true });
        }

        const studentReports = await this.prisma.studentAiAnalysisReport.findMany({
          where: { examId: examId },
          include: {
            examStudent: {
              include: { student: true },
            },
          },
        });

        let processedCount = 0;
        const totalReports = studentReports.length;

        if (totalReports > 0) {
          for (const report of studentReports) {
            const studentName =
              report.examStudent?.student?.name ||
              report.examStudent?.displayName ||
              report.examStudent?.username ||
              'unknown';
            const safeName = studentName.replace(/[\\/:*?"<>|]/g, '_');
            const studentIdentifier =
              report.examStudent?.student?.studentId || report.examStudent?.username || '';
            const safeIdentifier = studentIdentifier
              ? `_${studentIdentifier.replace(/[\\/:*?"<>|]/g, '_')}`
              : '';
            const studentPdfPath = path.join(studentReportsDir, `${safeName}${safeIdentifier}.pdf`);

            const doc = new PDFDocument();
            const stream = fs.createWriteStream(studentPdfPath);
            doc.pipe(stream);
            await this.generateStudentPdfReport(doc, report, exam);

            await new Promise<void>((resolve, reject) => {
              stream.on('finish', resolve);
              stream.on('error', reject);
              doc.on('error', reject);
              doc.end();
            });

            processedCount++;
            if (processedCount % 5 === 0 || processedCount === totalReports) {
              const currentPercent = 50 + Math.floor((processedCount / totalReports) * 30);
              sendProgress(currentPercent, 'student-ai-pdfs', undefined, {
                processedCount,
                totalReports,
              });
            }
          }
        } else {
          sendProgress(80, 'student-ai-pdfs', '没有发现学生AI分析报告', {
            processedCount: 0,
            totalReports: 0,
          });
        }
      }

      // 6. 打包 ZIP (90%)
      sendProgress(90, 'zipping', '正在打包文件...');

      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver.create('zip', { zlib: { level: 9 } });

      output.on('error', (err) => {
        console.error('[exam-export] output stream error:', err);
      });

      archive.on('warning', (err: any) => {
        console.warn('[exam-export] archiver warning:', err);
      });

      output.on('close', () => {
        // 7. 完成 (100%)
        sendProgress(100, 'complete', '导出完成，正在下载...');
        res.write(
          `data: ${JSON.stringify({ type: 'complete', downloadUrl: `/api/exams/download-export/${downloadFileName}` })}\n\n`
        );
        res.end();

        //  zip  (TTL)
        setTimeout(() => {
          fs.unlink(zipFilePath, () => {});
        }, exportZipRetentionMs);

        //  ( zip )
        setTimeout(() => {
          fs.rm(tempDir, { recursive: true, force: true }, () => {});
        }, 1_000);
      });

      archive.on('error', (err: any) => {
        console.error('[exam-export] archiver error:', err);
        throw err;
      });

      archive.pipe(output);
      archive.directory(tempDir, false);
      await archive.finalize();
      // Ensure output stream is fully flushed before returning.
      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出失败';
      console.error('Export failed:', error);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message,
          details: process.env.NODE_ENV !== 'production' ? String(error) : undefined,
        })}\n\n`
      );
      res.end();
    }
  }

  async downloadExport(filename: string, res: Response) {
    const filePath = path.join(process.cwd(), 'temp', 'downloads', filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('文件不存在或已过期');
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        // 注意：不要在下载回调里删除文件。
        // `res.download` 的回调在响应结束后触发，
        // 对于部分客户端/代理，可能导致二次请求（Range/重试）直接 404。
      }
    });
  }
}
