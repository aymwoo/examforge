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
exports.ExamService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ExamService = class ExamService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
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
    async findAll(paginationDto) {
        const { page = 1, limit = 20, status } = paginationDto;
        const skip = (page - 1) * limit;
        const where = {};
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
    async findById(id) {
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
            throw new common_1.NotFoundException(`Exam #${id} not found`);
        }
        return this.transformExam(exam);
    }
    async update(id, dto) {
        await this.findById(id);
        const updateData = {};
        if (dto.title !== undefined)
            updateData.title = dto.title;
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.duration !== undefined)
            updateData.duration = dto.duration;
        if (dto.totalScore !== undefined)
            updateData.totalScore = dto.totalScore;
        if (dto.startTime !== undefined)
            updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
        if (dto.endTime !== undefined)
            updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        const updated = await this.prisma.exam.update({
            where: { id },
            data: updateData,
        });
        return updated;
    }
    async delete(id) {
        await this.findById(id);
        await this.prisma.exam.delete({ where: { id } });
    }
    async addQuestion(examId, dto) {
        await this.findById(examId);
        const question = await this.prisma.question.findUnique({
            where: { id: dto.questionId },
        });
        if (!question) {
            throw new common_1.NotFoundException(`Question #${dto.questionId} not found`);
        }
        const existing = await this.prisma.examQuestion.findFirst({
            where: {
                examId,
                questionId: dto.questionId,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Question already added to this exam');
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
    async removeQuestion(examId, questionId) {
        await this.findById(examId);
        const examQuestion = await this.prisma.examQuestion.findFirst({
            where: {
                examId,
                questionId,
            },
        });
        if (!examQuestion) {
            throw new common_1.NotFoundException('Question not found in this exam');
        }
        await this.prisma.examQuestion.delete({
            where: { id: examQuestion.id },
        });
    }
    async updateQuestionOrder(examId, questionId, order, score) {
        await this.findById(examId);
        const examQuestion = await this.prisma.examQuestion.findFirst({
            where: {
                examId,
                questionId,
            },
        });
        if (!examQuestion) {
            throw new common_1.NotFoundException('Question not found in this exam');
        }
        return this.prisma.examQuestion.update({
            where: { id: examQuestion.id },
            data: {
                order,
                ...(score !== undefined && { score }),
            },
        });
    }
    transformExam(exam) {
        return {
            ...exam,
            questions: exam.examQuestions.map((eq) => ({
                ...eq.question,
                order: eq.order,
                score: eq.score,
            })),
            submissionCount: exam._count.submissions,
            examQuestions: undefined,
            _count: undefined,
        };
    }
};
exports.ExamService = ExamService;
exports.ExamService = ExamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamService);
//# sourceMappingURL=exam.service.js.map