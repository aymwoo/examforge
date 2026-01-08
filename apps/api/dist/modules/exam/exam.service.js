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
exports.ExamService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const account_generator_1 = require("../../common/utils/account-generator");
const bcrypt = __importStar(require("bcrypt"));
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
                accountModes: JSON.stringify(dto.accountModes || ['TEMPORARY_IMPORT']),
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
        if (dto.accountModes !== undefined)
            updateData.accountModes = JSON.stringify(dto.accountModes);
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
            accountModes: exam.accountModes ? JSON.parse(exam.accountModes) : ['TEMPORARY_IMPORT'],
            questions: exam.examQuestions.map((eq) => ({
                id: eq.id,
                examId: eq.examId,
                questionId: eq.questionId,
                order: eq.order,
                score: eq.score,
                question: eq.question,
            })),
            submissionCount: exam._count.submissions,
            examQuestions: undefined,
            _count: undefined,
        };
    }
    async addStudent(examId, dto) {
        await this.findById(examId);
        const existing = await this.prisma.examStudent.findFirst({
            where: {
                examId,
                username: dto.username,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Username already exists in this exam');
        }
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
    async batchAddStudents(examId, dto) {
        await this.findById(examId);
        const results = [];
        const errors = [];
        for (const student of dto.students) {
            try {
                const result = await this.addStudent(examId, student);
                results.push(result);
            }
            catch (error) {
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
    async getExamStudents(examId) {
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
    async updateExamStudent(examId, studentId, dto) {
        await this.findById(examId);
        const student = await this.prisma.examStudent.findFirst({
            where: { id: studentId, examId },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found in this exam');
        }
        const updateData = {};
        if (dto.username)
            updateData.username = dto.username;
        if (dto.displayName !== undefined)
            updateData.displayName = dto.displayName;
        if (dto.password) {
            updateData.password = await bcrypt.hash(dto.password, 10);
        }
        return this.prisma.examStudent.update({
            where: { id: studentId },
            data: updateData,
        });
    }
    async deleteExamStudent(examId, studentId) {
        await this.findById(examId);
        const student = await this.prisma.examStudent.findFirst({
            where: { id: studentId, examId },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found in this exam');
        }
        await this.prisma.examStudent.delete({
            where: { id: studentId },
        });
    }
    async generateStudentAccounts(examId, count, prefix = 'student') {
        const exam = await this.findById(examId);
        const students = [];
        for (let i = 1; i <= count; i++) {
            const username = account_generator_1.AccountGenerator.generateTemporaryUsername(exam.title, '', i);
            const password = account_generator_1.AccountGenerator.generateMemorablePassword();
            students.push({
                username,
                password,
                displayName: `学生${i}`,
            });
        }
        return this.batchAddStudents(examId, { students });
    }
    async importStudentsFromClass(examId, classId) {
        await this.findById(examId);
        const students = await this.prisma.student.findMany({
            where: { classId },
        });
        const results = [];
        const errors = [];
        for (const student of students) {
            try {
                const username = account_generator_1.AccountGenerator.generatePermanentUsername(student.studentId);
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
                        password: student.password,
                        displayName: student.name,
                        accountType: 'PERMANENT',
                        studentId: student.studentId,
                    },
                });
                results.push(examStudent);
            }
            catch (error) {
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
    async importTemporaryStudents(examId, studentsData) {
        const exam = await this.findById(examId);
        const results = [];
        const errors = [];
        for (let i = 0; i < studentsData.length; i++) {
            const studentData = studentsData[i];
            try {
                const username = account_generator_1.AccountGenerator.generateTemporaryUsername(exam.title, studentData.name, i + 1);
                const existing = await this.prisma.examStudent.findFirst({
                    where: { examId, username },
                });
                if (existing) {
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
                    const password = account_generator_1.AccountGenerator.generateMemorablePassword();
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
                const password = account_generator_1.AccountGenerator.generateMemorablePassword();
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
            }
            catch (error) {
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
    generateRandomPassword(length = 8) {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
};
exports.ExamService = ExamService;
exports.ExamService = ExamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExamService);
//# sourceMappingURL=exam.service.js.map