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
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  private get question() {
    return this.prisma.question;
  }

  async create(dto: CreateQuestionDto, userId?: string) {
    const optionsJson = dto.options ? JSON.stringify(dto.options) : null;
    const matchingJson = dto.matching ? JSON.stringify(dto.matching) : null;
    const tagsStr = dto.tags ? JSON.stringify(dto.tags) : '[]';
    const imagesStr = dto.images ? JSON.stringify(dto.images) : '[]';

    return this.prisma.question.create({
      data: {
        content: dto.content,
        type: dto.type as any,
        options: optionsJson,
        answer: serializeQuestionAnswer(dto.answer ?? matchingJson),
        explanation: dto.explanation,
        illustration: dto.illustration,
        images: imagesStr,
        tags: tagsStr,
        difficulty: dto.difficulty || 1,
        status: dto.status || QuestionStatus.DRAFT,
        knowledgePoint: dto.knowledgePoint,
        isPublic: dto.isPublic ?? true,
        createdBy: userId,
      },
    });
  }

  async findAll(paginationDto: PaginationDto, userId?: string, userRole?: string) {
    const { page = 1, limit = 20, type, difficulty, tags, ids } = paginationDto;
    const isIdFilter = Boolean(ids);
    const skip = isIdFilter ? undefined : (page - 1) * limit;

    const where: any = {};

    // If specific IDs are provided, filter by them
    if (ids) {
      const idArray = ids.split(',').filter(Boolean);
      if (idArray.length > 0) {
        where.id = { in: idArray };
      }
    } else {
      // Otherwise use normal filters
      if (type) where.type = type;
      if (difficulty) where.difficulty = difficulty;
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        where.tags = {
          contains: tagArray[0],
        };
      }
    }

    // 权限过滤：只显示公开题目或自己创建的题目（管理员可以看到所有题目）
    if (userRole !== 'ADMIN') {
      where.OR = [{ isPublic: true }, { createdBy: userId }];
    }

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: isIdFilter ? undefined : limit,
        orderBy: [
          { createdAt: 'desc' }, // 按创建时间倒序排列（最新的在前）
          { importOrder: 'asc' }, // 在创建时间相同的情况下，按导入顺序排列
        ],
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
        page: isIdFilter ? 1 : page,
        limit: isIdFilter ? total : limit,
        totalPages: isIdFilter ? 1 : Math.ceil(total / limit),
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
    if (dto.answer !== undefined || dto.matching !== undefined) {
      updateData.answer = serializeQuestionAnswer(dto.answer ?? dto.matching);
    }
    if (dto.explanation !== undefined) updateData.explanation = dto.explanation;
    if (dto.illustration !== undefined) updateData.illustration = dto.illustration;
    if (dto.images !== undefined) updateData.images = JSON.stringify(dto.images);
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

  async batchUpdateTags(
    ids: string[],
    tags: string[],
    userId?: string,
    userRole?: string
  ): Promise<{ updated: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No question IDs provided');
    }

    // 对于非管理员，需要验证用户权限
    if (userRole !== 'ADMIN') {
      // 检查所有题目是否都是当前用户创建的
      const questions = await this.prisma.question.findMany({
        where: { id: { in: ids } },
        select: { createdBy: true },
      });

      const hasUnownedQuestions = questions.some((q) => q.createdBy !== userId);
      if (hasUnownedQuestions) {
        throw new UnprocessableEntityException('You can only update tags for your own questions');
      }
    }

    const result = await this.prisma.question.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        tags: JSON.stringify(tags),
      },
    });

    return { updated: result.count };
  }

  async clearAll(): Promise<{ deleted: number }> {
    const result = await this.prisma.question.deleteMany({});
    return { deleted: result.count };
  }

  private safeParseImages(imagesStr: string | null): string[] {
    if (!imagesStr || typeof imagesStr !== 'string' || !imagesStr.trim()) {
      return [];
    }
    try {
      return JSON.parse(imagesStr);
    } catch {
      return [];
    }
  }

  async addImage(
    questionId: string,
    imageBuffer: Buffer,
    originalName: string,
    userId: string
  ): Promise<{ imagePath: string }> {
    const question = await this.findById(questionId, userId, 'ADMIN');

    // 处理文件名编码问题
    const decodedName = Buffer.from(originalName, 'latin1').toString('utf8');

    // 生成唯一文件名
    const ext = path.extname(decodedName);
    const fileName = `${randomUUID()}${ext}`;
    const imagePath = path.join('uploads', 'images', 'questions', fileName);
    const fullPath = path.join(process.cwd(), imagePath);

    // 保存文件
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, imageBuffer);

    // 更新数据库
    const currentImages = this.safeParseImages(question.images);
    currentImages.push(imagePath);

    await this.prisma.question.update({
      where: { id: questionId },
      data: { images: JSON.stringify(currentImages) },
    });

    return { imagePath };
  }

  async removeImage(
    questionId: string,
    imageIndex: number,
    userId: string
  ): Promise<{ success: boolean }> {
    const question = await this.findById(questionId, userId, 'ADMIN');

    const currentImages = this.safeParseImages(question.images);
    if (imageIndex < 0 || imageIndex >= currentImages.length) {
      throw new BadRequestException('Invalid image index');
    }

    const imagePath = currentImages[imageIndex];
    const fullPath = path.join(process.cwd(), imagePath);

    // 删除文件
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // 文件可能已经不存在，继续执行
    }

    // 更新数据库
    currentImages.splice(imageIndex, 1);
    await this.prisma.question.update({
      where: { id: questionId },
      data: { images: JSON.stringify(currentImages) },
    });

    return { success: true };
  }

  async addClipboardImage(
    questionId: string,
    imageData: string,
    userId: string
  ): Promise<{ imagePath: string }> {
    const question = await this.findById(questionId, userId, 'ADMIN');

    // 解析base64数据
    const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid image data format');
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 生成唯一文件名
    const fileName = `${randomUUID()}.${ext}`;
    const imagePath = path.join('uploads', 'images', 'questions', fileName);
    const fullPath = path.join(process.cwd(), imagePath);

    // 保存文件
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    // 更新数据库
    const currentImages = this.safeParseImages(question.images);
    currentImages.push(imagePath);

    await this.prisma.question.update({
      where: { id: questionId },
      data: { images: JSON.stringify(currentImages) },
    });

    return { imagePath };
  }

  private transformQuestion(question: any) {
    let matching = undefined;
    if (question.type === QuestionType.MATCHING) {
      matching = this.parseMatchingAnswer(question.answer);
    }
    return {
      ...question,
      options: this.safeParseOptions(question.options),
      answer: question.answer ?? undefined,
      matching,
      tags: this.safeParseTags(question.tags),
      images: question.images ? this.safeParseImages(question.images) : [],
    };
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

  private safeParseTags(tagsStr: string | null | undefined): string[] {
    if (!tagsStr || typeof tagsStr !== 'string' || !tagsStr.trim()) {
      return [];
    }
    try {
      const parsed = JSON.parse(tagsStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
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
}
