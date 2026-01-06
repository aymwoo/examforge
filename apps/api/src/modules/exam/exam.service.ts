import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        totalScore: dto.totalScore || 100,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        status: 'DRAFT',
      },
    });
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
            select: { submissions: true },
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
          select: { submissions: true },
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
      questions: exam.examQuestions.map((eq: any) => ({
        ...eq.question,
        order: eq.order,
        score: eq.score,
      })),
      submissionCount: exam._count.submissions,
      examQuestions: undefined,
      _count: undefined,
    };
  }
}
