"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const question_enum_1 = require("../../common/enums/question.enum");
const question_answer_1 = require("../../common/utils/question-answer");
let QuestionService = class QuestionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    get question() {
        return this.prisma.question;
    }
    async create(dto, userId) {
        const optionsJson = dto.options ? JSON.stringify(dto.options) : null;
        const tagsStr = dto.tags ? JSON.stringify(dto.tags) : '[]';
        return this.prisma.question.create({
            data: {
                content: dto.content,
                type: dto.type,
                options: optionsJson,
                answer: (0, question_answer_1.serializeQuestionAnswer)(dto.answer),
                explanation: dto.explanation,
                illustration: dto.illustration,
                tags: tagsStr,
                difficulty: dto.difficulty || 1,
                status: question_enum_1.QuestionStatus.DRAFT,
                knowledgePoint: dto.knowledgePoint,
                isPublic: dto.isPublic ?? true,
                createdBy: userId,
            },
        });
    }
    async findAll(paginationDto, userId, userRole) {
        const { page = 1, limit = 20, type, difficulty, tags } = paginationDto;
        const skip = (page - 1) * limit;
        const where = {};
        if (type)
            where.type = type;
        if (difficulty)
            where.difficulty = difficulty;
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            where.tags = {
                contains: tagArray[0],
            };
        }
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
    async findById(id, userId, userRole) {
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
            throw new common_1.NotFoundException(`Question #${id} not found`);
        }
        if (userRole !== 'ADMIN' && !question.isPublic && question.createdBy !== userId) {
            throw new common_1.NotFoundException(`Question #${id} not found`);
        }
        return this.transformQuestion(question);
    }
    async update(id, dto, userId, userRole) {
        const question = await this.findById(id, userId, userRole);
        if (userRole !== 'ADMIN' && question.createdBy !== userId) {
            throw new common_1.UnprocessableEntityException('You can only update your own questions');
        }
        const updateData = {};
        if (dto.content !== undefined)
            updateData.content = dto.content;
        if (dto.type !== undefined)
            updateData.type = dto.type;
        if (dto.options !== undefined)
            updateData.options = JSON.stringify(dto.options);
        if (dto.answer !== undefined)
            updateData.answer = (0, question_answer_1.serializeQuestionAnswer)(dto.answer);
        if (dto.explanation !== undefined)
            updateData.explanation = dto.explanation;
        if (dto.illustration !== undefined)
            updateData.illustration = dto.illustration;
        if (dto.tags !== undefined)
            updateData.tags = JSON.stringify(dto.tags);
        if (dto.difficulty !== undefined)
            updateData.difficulty = dto.difficulty;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.knowledgePoint !== undefined)
            updateData.knowledgePoint = dto.knowledgePoint;
        if (dto.isPublic !== undefined)
            updateData.isPublic = dto.isPublic;
        const updated = await this.prisma.question.update({
            where: { id },
            data: updateData,
        });
        return this.transformQuestion(updated);
    }
    async delete(id, userId, userRole) {
        const question = await this.findById(id, userId, userRole);
        if (userRole !== 'ADMIN' && question.createdBy !== userId) {
            throw new common_1.UnprocessableEntityException('You can only delete your own questions');
        }
        await this.prisma.question.delete({ where: { id } });
    }
    async deleteMany(ids) {
        if (!ids || ids.length === 0) {
            throw new common_1.BadRequestException('No question IDs provided');
        }
        const result = await this.prisma.question.deleteMany({
            where: {
                id: { in: ids },
            },
        });
        return { deleted: result.count };
    }
    async clearAll() {
        const result = await this.prisma.question.deleteMany({});
        return { deleted: result.count };
    }
    transformQuestion(question) {
        return {
            ...question,
            options: question.options ? JSON.parse(question.options) : undefined,
            answer: question.answer ?? undefined,
            tags: question.tags ? JSON.parse(question.tags) : [],
        };
    }
};
exports.QuestionService = QuestionService;
exports.QuestionService = QuestionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuestionService);
//# sourceMappingURL=question.service.js.map