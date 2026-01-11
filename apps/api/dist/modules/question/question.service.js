"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const question_enum_1 = require("../../common/enums/question.enum");
const question_answer_1 = require("../../common/utils/question-answer");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
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
        const imagesStr = dto.images ? JSON.stringify(dto.images) : '[]';
        return this.prisma.question.create({
            data: {
                content: dto.content,
                type: dto.type,
                options: optionsJson,
                answer: (0, question_answer_1.serializeQuestionAnswer)(dto.answer),
                explanation: dto.explanation,
                illustration: dto.illustration,
                images: imagesStr,
                tags: tagsStr,
                difficulty: dto.difficulty || 1,
                status: dto.status || question_enum_1.QuestionStatus.DRAFT,
                knowledgePoint: dto.knowledgePoint,
                isPublic: dto.isPublic ?? true,
                createdBy: userId,
            },
        });
    }
    async findAll(paginationDto, userId, userRole) {
        const { page = 1, limit = 20, type, difficulty, tags, ids } = paginationDto;
        const skip = (page - 1) * limit;
        const where = {};
        if (ids) {
            const idArray = ids.split(',').filter(Boolean);
            if (idArray.length > 0) {
                where.id = { in: idArray };
            }
        }
        else {
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
        if (dto.images !== undefined)
            updateData.images = JSON.stringify(dto.images);
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
    safeParseImages(imagesStr) {
        if (!imagesStr || typeof imagesStr !== 'string' || !imagesStr.trim()) {
            return [];
        }
        try {
            return JSON.parse(imagesStr);
        }
        catch {
            return [];
        }
    }
    async addImage(questionId, imageBuffer, originalName, userId) {
        const question = await this.findById(questionId, userId, 'ADMIN');
        const decodedName = Buffer.from(originalName, 'latin1').toString('utf8');
        const ext = path.extname(decodedName);
        const fileName = `${(0, uuid_1.v4)()}${ext}`;
        const imagePath = path.join('uploads', 'images', 'questions', fileName);
        const fullPath = path.join(process.cwd(), imagePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, imageBuffer);
        const currentImages = this.safeParseImages(question.images);
        currentImages.push(imagePath);
        await this.prisma.question.update({
            where: { id: questionId },
            data: { images: JSON.stringify(currentImages) },
        });
        return { imagePath };
    }
    async removeImage(questionId, imageIndex, userId) {
        const question = await this.findById(questionId, userId, 'ADMIN');
        const currentImages = this.safeParseImages(question.images);
        if (imageIndex < 0 || imageIndex >= currentImages.length) {
            throw new common_1.BadRequestException('Invalid image index');
        }
        const imagePath = currentImages[imageIndex];
        const fullPath = path.join(process.cwd(), imagePath);
        try {
            await fs.unlink(fullPath);
        }
        catch (error) {
        }
        currentImages.splice(imageIndex, 1);
        await this.prisma.question.update({
            where: { id: questionId },
            data: { images: JSON.stringify(currentImages) },
        });
        return { success: true };
    }
    async addClipboardImage(questionId, imageData, userId) {
        const question = await this.findById(questionId, userId, 'ADMIN');
        const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
            throw new common_1.BadRequestException('Invalid image data format');
        }
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${(0, uuid_1.v4)()}.${ext}`;
        const imagePath = path.join('uploads', 'images', 'questions', fileName);
        const fullPath = path.join(process.cwd(), imagePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, buffer);
        const currentImages = this.safeParseImages(question.images);
        currentImages.push(imagePath);
        await this.prisma.question.update({
            where: { id: questionId },
            data: { images: JSON.stringify(currentImages) },
        });
        return { imagePath };
    }
    transformQuestion(question) {
        return {
            ...question,
            options: question.options ? JSON.parse(question.options) : undefined,
            answer: question.answer ?? undefined,
            tags: question.tags ? JSON.parse(question.tags) : [],
            images: question.images ? this.safeParseImages(question.images) : [],
        };
    }
};
exports.QuestionService = QuestionService;
exports.QuestionService = QuestionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuestionService);
//# sourceMappingURL=question.service.js.map