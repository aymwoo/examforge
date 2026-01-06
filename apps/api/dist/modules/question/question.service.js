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
let QuestionService = class QuestionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const optionsJson = dto.options ? JSON.stringify(dto.options) : null;
        const tagsStr = dto.tags ? JSON.stringify(dto.tags) : '[]';
        return this.prisma.question.create({
            data: {
                content: dto.content,
                type: dto.type,
                options: optionsJson,
                answer: dto.answer,
                explanation: dto.explanation,
                tags: tagsStr,
                difficulty: dto.difficulty || 1,
                status: question_enum_1.QuestionStatus.DRAFT,
                knowledgePoint: dto.knowledgePoint,
            },
        });
    }
    async findAll(paginationDto) {
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
        const [data, total] = await Promise.all([
            this.prisma.question.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
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
    async findById(id) {
        const question = await this.prisma.question.findUnique({ where: { id } });
        if (!question) {
            throw new common_1.NotFoundException(`Question #${id} not found`);
        }
        return this.transformQuestion(question);
    }
    async update(id, dto) {
        await this.findById(id);
        const updateData = {};
        if (dto.content !== undefined)
            updateData.content = dto.content;
        if (dto.type !== undefined)
            updateData.type = dto.type;
        if (dto.options !== undefined)
            updateData.options = JSON.stringify(dto.options);
        if (dto.answer !== undefined)
            updateData.answer = dto.answer;
        if (dto.explanation !== undefined)
            updateData.explanation = dto.explanation;
        if (dto.tags !== undefined)
            updateData.tags = JSON.stringify(dto.tags);
        if (dto.difficulty !== undefined)
            updateData.difficulty = dto.difficulty;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.knowledgePoint !== undefined)
            updateData.knowledgePoint = dto.knowledgePoint;
        const updated = await this.prisma.question.update({
            where: { id },
            data: updateData,
        });
        return this.transformQuestion(updated);
    }
    async delete(id) {
        await this.findById(id);
        await this.prisma.question.delete({ where: { id } });
    }
    transformQuestion(question) {
        return {
            ...question,
            options: question.options ? JSON.parse(question.options) : undefined,
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