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
exports.ImportService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../prisma/prisma.service");
const question_enum_1 = require("../../common/enums/question.enum");
let ImportService = class ImportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    get question() {
        return this.prisma.question;
    }
    async importFromExcel(buffer) {
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        if (data.length === 0) {
            throw new common_1.BadRequestException('No data found in Excel file');
        }
        const result = {
            success: 0,
            failed: 0,
            errors: [],
        };
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;
            try {
                const dto = this.mapRowToDto(row);
                await this.prisma.question.create({
                    data: {
                        content: dto.content,
                        type: dto.type,
                        options: dto.options ? JSON.stringify(dto.options) : null,
                        answer: dto.answer,
                        explanation: dto.explanation,
                        tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
                        difficulty: dto.difficulty || 1,
                        status: question_enum_1.QuestionStatus.DRAFT,
                        knowledgePoint: dto.knowledgePoint,
                    },
                });
                result.success++;
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    row: rowNum,
                    message: error.message || 'Unknown error',
                });
            }
        }
        return result;
    }
    mapRowToDto(row) {
        const content = row['题干'] || row['content'] || row['Content'] || '';
        const typeStr = row['题型'] || row['type'] || row['Type'] || 'SINGLE_CHOICE';
        const answer = row['答案'] || row['answer'] || row['Answer'] || '';
        if (!content) {
            throw new common_1.BadRequestException('题干不能为空，请确保 Excel 包含"题干"列');
        }
        const typeMap = {
            单选题: question_enum_1.QuestionType.SINGLE_CHOICE,
            single: question_enum_1.QuestionType.SINGLE_CHOICE,
            single_choice: question_enum_1.QuestionType.SINGLE_CHOICE,
            SINGLE_CHOICE: question_enum_1.QuestionType.SINGLE_CHOICE,
            多选题: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple_choice: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            MULTIPLE_CHOICE: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            判断题: question_enum_1.QuestionType.TRUE_FALSE,
            true_false: question_enum_1.QuestionType.TRUE_FALSE,
            TRUE_FALSE: question_enum_1.QuestionType.TRUE_FALSE,
            填空题: question_enum_1.QuestionType.FILL_BLANK,
            fill_blank: question_enum_1.QuestionType.FILL_BLANK,
            FILL_BLANK: question_enum_1.QuestionType.FILL_BLANK,
            简答题: question_enum_1.QuestionType.ESSAY,
            essay: question_enum_1.QuestionType.ESSAY,
            ESSAY: question_enum_1.QuestionType.ESSAY,
        };
        const type = typeMap[typeStr.toLowerCase()] || question_enum_1.QuestionType.SINGLE_CHOICE;
        const dto = {
            content,
            type,
            answer: answer || undefined,
        };
        if (row['选项'] || row['options'] || row['Options']) {
            const optionsStr = row['选项'] || row['options'] || row['Options'];
            const options = this.parseOptions(optionsStr);
            if (options.length > 0) {
                dto.options = options;
            }
        }
        if (row['解析'] || row['explanation'] || row['Explanation']) {
            dto.explanation = row['解析'] || row['explanation'] || row['Explanation'];
        }
        if (row['标签'] || row['tags'] || row['Tags']) {
            const tagsStr = row['标签'] || row['tags'] || row['Tags'];
            dto.tags = Array.isArray(tagsStr)
                ? tagsStr
                : tagsStr
                    .toString()
                    .split(',')
                    .map((t) => t.trim());
        }
        if (row['难度'] || row['difficulty'] || row['Difficulty']) {
            const difficulty = parseInt(row['难度'] || row['difficulty'] || row['Difficulty']);
            if (!isNaN(difficulty) && difficulty >= 1 && difficulty <= 5) {
                dto.difficulty = difficulty;
            }
        }
        if (row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint']) {
            dto.knowledgePoint = row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint'];
        }
        return dto;
    }
    parseOptions(optionsStr) {
        if (Array.isArray(optionsStr)) {
            return optionsStr.map((opt, idx) => ({
                label: String.fromCharCode(65 + idx),
                content: opt,
            }));
        }
        if (typeof optionsStr === 'string') {
            const parts = optionsStr.split(/[,;|]/).map((s) => s.trim());
            return parts.map((opt, idx) => ({
                label: String.fromCharCode(65 + idx),
                content: opt,
            }));
        }
        return [];
    }
};
exports.ImportService = ImportService;
exports.ImportService = ImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImportService);
//# sourceMappingURL=import.service.js.map