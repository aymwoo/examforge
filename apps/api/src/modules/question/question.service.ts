import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionType, QuestionStatus } from '@/common/enums/question.enum';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { serializeQuestionAnswer } from '@/common/utils/question-answer';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  private get question() {
    return this.prisma.question;
  }

  async create(dto: CreateQuestionDto, userId?: string) {
    const optionsJson = dto.options ? JSON.stringify(dto.options) : null;
    const tagsStr = dto.tags ? JSON.stringify(dto.tags) : '[]';

    return this.prisma.question.create({
      data: {
        content: dto.content,
        type: dto.type as any,
        options: optionsJson,
        answer: serializeQuestionAnswer(dto.answer),
        explanation: dto.explanation,
        illustration: dto.illustration,
        tags: tagsStr,
        difficulty: dto.difficulty || 1,
        status: QuestionStatus.DRAFT,
        knowledgePoint: dto.knowledgePoint,
        isPublic: dto.isPublic ?? true,
        createdBy: userId,
      },
    });
  }

  async findAll(paginationDto: PaginationDto, userId?: string, userRole?: string) {
    const { page = 1, limit = 20, type, difficulty, tags } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = {
        contains: tagArray[0],
      };
    }

    // 权限过滤：只显示公开题目或自己创建的题目（管理员可以看到所有题目）
    if (userRole !== 'ADMIN') {
      where.OR = [
        { isPublic: true },
        { createdBy: userId },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: data.map((q) => this.transformQuestion(q)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId?: string, userRole?: string) {
    const question = await this.prisma.question.findUnique({ 
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
    
    if (!question) {
      throw new NotFoundException(`Question #${id} not found`);
    }

    // 权限检查：只有公开题目、自己创建的题目或管理员可以查看
    if (userRole !== 'ADMIN' && !question.isPublic && question.createdBy !== userId) {
      throw new NotFoundException(`Question #${id} not found`);
    }

    return this.transformQuestion(question);
  }

  async update(id: string, dto: UpdateQuestionDto, userId?: string, userRole?: string) {
    const question = await this.findById(id, userId, userRole);

    // 权限检查：只有创建者或管理员可以修改
    if (userRole !== 'ADMIN' && question.createdBy !== userId) {
      throw new UnprocessableEntityException('You can only update your own questions');
    }

    const updateData: any = {};
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.options !== undefined) updateData.options = JSON.stringify(dto.options);
    if (dto.answer !== undefined) updateData.answer = serializeQuestionAnswer(dto.answer);
    if (dto.explanation !== undefined) updateData.explanation = dto.explanation;
    if (dto.illustration !== undefined) updateData.illustration = dto.illustration;
    if (dto.tags !== undefined) updateData.tags = JSON.stringify(dto.tags);
    if (dto.difficulty !== undefined) updateData.difficulty = dto.difficulty;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.knowledgePoint !== undefined) updateData.knowledgePoint = dto.knowledgePoint;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;

    const updated = await this.prisma.question.update({
      where: { id },
      data: updateData,
    });

    return this.transformQuestion(updated);
  }

  async delete(id: string, userId?: string, userRole?: string) {
    const question = await this.findById(id, userId, userRole);

    // 权限检查：只有创建者或管理员可以删除
    if (userRole !== 'ADMIN' && question.createdBy !== userId) {
      throw new UnprocessableEntityException('You can only delete your own questions');
    }

    await this.prisma.question.delete({ where: { id } });
  }

  async deleteMany(ids: string[]): Promise<{ deleted: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No question IDs provided');
    }

    const result = await this.prisma.question.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return { deleted: result.count };
  }

  async clearAll(): Promise<{ deleted: number }> {
    const result = await this.prisma.question.deleteMany({});
    return { deleted: result.count };
  }

  private transformQuestion(question: any) {
    return {
      ...question,
      options: question.options ? JSON.parse(question.options) : undefined,
      answer: question.answer ?? undefined,
      tags: question.tags ? JSON.parse(question.tags) : [],
    };
  }
}
