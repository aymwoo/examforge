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
const ai_service_1 = require("../ai/ai.service");
const account_generator_1 = require("../../common/utils/account-generator");
const bcrypt = __importStar(require("bcrypt"));
let ExamService = class ExamService {
    prisma;
    aiService;
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
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
            examQuestions: exam.examQuestions.map((eq) => ({
                id: eq.id,
                examId: eq.examId,
                questionId: eq.questionId,
                order: eq.order,
                score: eq.score,
                question: eq.question,
            })),
            submissionCount: exam._count.submissions,
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
    async getExamForTaking(examId) {
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
            throw new common_1.NotFoundException('考试不存在');
        }
        if (exam.status !== 'PUBLISHED') {
            throw new common_1.BadRequestException('考试未发布');
        }
        const now = new Date();
        if (exam.startTime && now < exam.startTime) {
            throw new common_1.BadRequestException('考试尚未开始');
        }
        if (exam.endTime && now > exam.endTime) {
            throw new common_1.BadRequestException('考试已结束');
        }
        return {
            id: exam.id,
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            totalScore: exam.totalScore,
            questions: exam.examQuestions.map(eq => ({
                id: eq.question.id,
                content: eq.question.content,
                type: eq.question.type,
                options: eq.question.options ? (() => {
                    try {
                        const parsed = JSON.parse(eq.question.options);
                        return Array.isArray(parsed)
                            ? parsed.map(opt => typeof opt === 'string' ? opt : opt.content || opt.label || String(opt))
                            : parsed;
                    }
                    catch {
                        return null;
                    }
                })() : null,
                score: eq.score,
                order: eq.order,
            })),
        };
    }
    async submitExam(examId, examStudentId, answers) {
        console.log(`开始提交考试: examId=${examId}, examStudentId=${examStudentId}`);
        console.log(`提交的答案:`, JSON.stringify(answers, null, 2));
        const existingSubmission = await this.prisma.submission.findFirst({
            where: { examId, examStudentId },
        });
        if (existingSubmission) {
            throw new common_1.ConflictException('考试已提交，不能重复提交');
        }
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
            throw new common_1.NotFoundException('考试不存在');
        }
        const gradingResults = await this.autoGradeSubmission(exam, answers, (progress) => {
            console.log(`评分进度: ${progress.current}/${progress.total} - ${progress.message}`);
        });
        const submission = await this.prisma.submission.create({
            data: {
                examId,
                examStudentId,
                answers: JSON.stringify(answers),
                score: gradingResults.totalScore,
                isAutoGraded: gradingResults.isFullyAutoGraded,
                gradingDetails: JSON.stringify({
                    details: gradingResults.details,
                    totalScore: gradingResults.totalScore,
                    maxTotalScore: gradingResults.maxTotalScore,
                    isFullyAutoGraded: gradingResults.isFullyAutoGraded,
                }),
            },
        });
        return {
            id: submission.id,
            score: submission.score,
            isAutoGraded: submission.isAutoGraded,
            submittedAt: submission.submittedAt,
            gradingResults: gradingResults,
        };
    }
    progressStreams = new Map();
    async submitExamAsync(examId, examStudentId, answers) {
        const streamKey = `${examId}-${examStudentId}`;
        try {
            const existingSubmission = await this.prisma.submission.findFirst({
                where: { examId, examStudentId },
            });
            if (existingSubmission) {
                this.sendProgress(streamKey, { type: 'error', message: '考试已提交，不能重复提交' });
                return;
            }
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
                this.sendProgress(streamKey, { type: 'error', message: '考试不存在' });
                return;
            }
            this.sendProgress(streamKey, { type: 'progress', current: 0, total: exam.examQuestions.length, message: '开始评分' });
            const gradingResults = await this.autoGradeSubmission(exam, answers, (progress) => {
                this.sendProgress(streamKey, { type: 'progress', ...progress });
            });
            const submission = await this.prisma.submission.create({
                data: {
                    examId,
                    examStudentId,
                    answers: JSON.stringify(answers),
                    score: gradingResults.totalScore,
                    isAutoGraded: gradingResults.isFullyAutoGraded,
                    gradingDetails: JSON.stringify({
                        details: gradingResults.details,
                        totalScore: gradingResults.totalScore,
                        maxTotalScore: gradingResults.maxTotalScore,
                        isFullyAutoGraded: gradingResults.isFullyAutoGraded,
                    }),
                },
            });
            this.sendProgress(streamKey, {
                type: 'complete',
                submission: {
                    id: submission.id,
                    score: submission.score,
                    isAutoGraded: submission.isAutoGraded,
                    submittedAt: submission.submittedAt,
                }
            });
        }
        catch (error) {
            console.error('异步提交失败:', error);
            this.sendProgress(streamKey, { type: 'error', message: error.message });
        }
    }
    sendProgress(streamKey, data) {
        const stream = this.progressStreams.get(streamKey);
        if (stream) {
            stream.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }
    async streamSubmissionProgress(examId, examStudentId, res) {
        const streamKey = `${examId}-${examStudentId}`;
        this.progressStreams.set(streamKey, res);
        const existingSubmission = await this.prisma.submission.findFirst({
            where: { examId, examStudentId },
        });
        if (existingSubmission) {
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                submission: {
                    id: existingSubmission.id,
                    score: existingSubmission.score,
                    isAutoGraded: existingSubmission.isAutoGraded,
                    submittedAt: existingSubmission.submittedAt,
                }
            })}\n\n`);
            res.end();
            return;
        }
        const keepAlive = setInterval(() => {
            res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        }, 30000);
        res.on('close', () => {
            clearInterval(keepAlive);
            this.progressStreams.delete(streamKey);
        });
    }
    async checkSubmissionStatus(examId, examStudentId) {
        const submission = await this.prisma.submission.findFirst({
            where: { examId, examStudentId },
            select: {
                id: true,
                score: true,
                isAutoGraded: true,
                submittedAt: true,
            },
        });
        return {
            hasSubmitted: !!submission,
            submission: submission || null,
        };
    }
    async autoGradeSubmission(exam, answers, onProgress) {
        console.log(`开始自动评分: 考试ID=${exam.id}, 题目数量=${exam.examQuestions.length}`);
        console.log(`考试题目类型分布:`, exam.examQuestions.map(eq => ({ id: eq.question.id, type: eq.question.type })));
        const details = {};
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
                message: `正在评分第${currentQuestion}题 (${question.type})`
            });
            console.log(`处理题目 ${currentQuestion}: 类型=${question.type}, ID=${question.id}`);
            if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
                const isCorrect = this.compareAnswers(studentAnswer, question.answer, question.type);
                const score = isCorrect ? maxScore : 0;
                details[question.id] = {
                    type: 'objective',
                    studentAnswer,
                    correctAnswer: question.answer,
                    isCorrect,
                    score,
                    maxScore,
                    feedback: isCorrect ? '答案正确' : `正确答案：${question.answer}`,
                };
                totalScore += score;
            }
            else if (question.type === 'ESSAY' || question.type === 'FILL_BLANK') {
                onProgress?.({
                    current: currentQuestion,
                    total: totalQuestions,
                    message: `正在AI评分第${currentQuestion}题 (主观题)`
                });
                console.log(`=== 开始真实AI评分 ===`);
                console.log(`题目ID: ${question.id}, 类型: ${question.type}`);
                const aiResult = await this.getAIGradingForSubjective(question.content, question.answer || '', studentAnswer || '', maxScore);
                details[question.id] = {
                    type: 'subjective',
                    studentAnswer,
                    referenceAnswer: question.answer,
                    aiGrading: aiResult,
                    score: aiResult.suggestedScore,
                    maxScore,
                    needsReview: aiResult.confidence < 0.8,
                };
                totalScore += aiResult.suggestedScore;
                if (aiResult.confidence < 0.9) {
                    isFullyAutoGraded = false;
                }
            }
        }
        onProgress?.({
            current: totalQuestions,
            total: totalQuestions,
            message: '评分完成'
        });
        return {
            details,
            totalScore: Math.round(totalScore * 100) / 100,
            maxTotalScore: exam.totalScore,
            isFullyAutoGraded,
        };
    }
    async getAIGradingForSubjective(questionContent, referenceAnswer, studentAnswer, maxScore) {
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
        const prompt = await this.buildGradingPrompt(questionContent, referenceAnswer, studentAnswer, maxScore);
        try {
            const aiResult = await this.aiService.gradeSubjectiveAnswer(prompt);
            console.log('AI评分结果:', JSON.stringify(aiResult, null, 2));
            return {
                suggestedScore: aiResult.score,
                reasoning: aiResult.reasoning,
                suggestions: aiResult.suggestions,
                confidence: aiResult.confidence,
            };
        }
        catch (error) {
            console.error('AI评分失败:', error);
            const wordCount = studentAnswer.length;
            const hasKeywords = referenceAnswer ? this.checkKeywords(studentAnswer, referenceAnswer) : 0.5;
            const isValidAnswer = this.isValidAnswer(studentAnswer);
            let scoreRatio = 0;
            if (isValidAnswer) {
                scoreRatio = 0.3;
                if (wordCount > 20)
                    scoreRatio += 0.1;
                if (wordCount > 50)
                    scoreRatio += 0.1;
                if (hasKeywords > 0.3)
                    scoreRatio += 0.3;
                if (wordCount > 100 && hasKeywords > 0.5)
                    scoreRatio += 0.2;
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
    async buildGradingPrompt(questionContent, referenceAnswer, studentAnswer, maxScore) {
        const gradingTemplate = await this.getSystemSetting('GRADING_PROMPT_TEMPLATE');
        if (gradingTemplate) {
            return gradingTemplate
                .replace('{questionContent}', questionContent)
                .replace('{questionType}', '主观题')
                .replace('{referenceAnswer}', referenceAnswer || '无标准答案，请根据题目要求和答案质量评分')
                .replace('{studentAnswer}', studentAnswer)
                .replace('{maxScore}', maxScore.toString());
        }
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
    async getSystemSetting(key) {
        try {
            const setting = await this.prisma.systemSetting.findUnique({
                where: { key }
            });
            return setting?.value || null;
        }
        catch (error) {
            console.error(`获取系统设置失败: ${key}`, error);
            return null;
        }
    }
    isValidAnswer(studentAnswer) {
        if (!studentAnswer || studentAnswer.trim().length < 3) {
            return false;
        }
        const answer = studentAnswer.trim().toLowerCase();
        if (/^[0-9\s]+$/.test(answer)) {
            return false;
        }
        if (/^(.)\1{4,}$/.test(answer)) {
            return false;
        }
        const hasChineseWords = /[\u4e00-\u9fa5]{2,}/.test(answer);
        const hasEnglishWords = /[a-z]{3,}/.test(answer);
        return hasChineseWords || hasEnglishWords;
    }
    checkKeywords(studentAnswer, referenceAnswer) {
        if (!referenceAnswer)
            return 0.5;
        const studentWords = studentAnswer.toLowerCase().split(/\s+/);
        const referenceWords = referenceAnswer.toLowerCase().split(/\s+/);
        let matchCount = 0;
        for (const word of referenceWords) {
            if (word.length > 2 && studentWords.some(sw => sw.includes(word) || word.includes(sw))) {
                matchCount++;
            }
        }
        return referenceWords.length > 0 ? matchCount / referenceWords.length : 0;
    }
    generateReasoning(scoreRatio, wordCount, keywordMatch) {
        const reasons = [];
        if (scoreRatio >= 0.9) {
            reasons.push('答案质量优秀');
        }
        else if (scoreRatio >= 0.7) {
            reasons.push('答案基本正确');
        }
        else if (scoreRatio >= 0.5) {
            reasons.push('答案部分正确');
        }
        else {
            reasons.push('答案需要改进');
        }
        if (wordCount < 20) {
            reasons.push('答案过于简短');
        }
        else if (wordCount > 100) {
            reasons.push('答案详细充实');
        }
        if (keywordMatch > 0.5) {
            reasons.push('涵盖了主要要点');
        }
        else if (keywordMatch < 0.3) {
            reasons.push('缺少关键要点');
        }
        return reasons.join('，');
    }
    generateSuggestions(scoreRatio) {
        if (scoreRatio >= 0.9) {
            return '答案很好，继续保持';
        }
        else if (scoreRatio >= 0.7) {
            return '可以进一步补充细节和例证';
        }
        else if (scoreRatio >= 0.5) {
            return '建议补充更多要点，加强逻辑性';
        }
        else {
            return '建议重新组织答案，确保回答了题目要求';
        }
    }
    async saveAnswers(examId, examStudentId, answers) {
        const exam = await this.prisma.exam.findUnique({
            where: { id: examId },
        });
        if (!exam) {
            throw new common_1.NotFoundException('考试不存在');
        }
        const existingSubmission = await this.prisma.submission.findFirst({
            where: { examId, examStudentId },
        });
        if (existingSubmission) {
            throw new common_1.ConflictException('考试已提交，不能再保存答案');
        }
        const now = new Date();
        if (now > exam.endTime) {
            throw new common_1.ConflictException('考试已结束，不能保存答案');
        }
        return { message: '答案保存成功', timestamp: new Date() };
    }
    async getExamSubmissions(examId) {
        const submissions = await this.prisma.submission.findMany({
            where: { examId },
            include: {
                examStudent: true,
            },
            orderBy: { submittedAt: 'desc' },
        });
        return submissions.map(submission => ({
            id: submission.id,
            student: {
                id: submission.examStudent?.id,
                username: submission.examStudent?.username,
                displayName: submission.examStudent?.displayName,
            },
            answers: JSON.parse(submission.answers),
            score: submission.score,
            isAutoGraded: submission.isAutoGraded,
            gradingDetails: submission.gradingDetails ? JSON.parse(submission.gradingDetails) : null,
            submittedAt: submission.submittedAt,
        }));
    }
    async gradeSubmission(submissionId, scores, totalScore, feedback) {
        const submission = await this.prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: totalScore,
                isAutoGraded: false,
            },
        });
        return {
            id: submission.id,
            score: submission.score,
            gradedAt: new Date(),
        };
    }
    async getAIGradingSuggestions(examId, submissionId) {
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
            throw new common_1.NotFoundException('提交记录不存在');
        }
        const gradingDetails = submission.gradingDetails ? JSON.parse(submission.gradingDetails) : null;
        if (!gradingDetails) {
            throw new common_1.NotFoundException('评分详情不存在，请重新提交考试');
        }
        const suggestions = {};
        if (gradingDetails && gradingDetails.details) {
            Object.entries(gradingDetails.details).forEach(([questionId, detail]) => {
                if (detail.type === 'objective') {
                    suggestions[questionId] = {
                        type: 'objective',
                        isCorrect: detail.isCorrect,
                        score: detail.score,
                        maxScore: detail.maxScore,
                        feedback: detail.feedback,
                    };
                }
                else if (detail.type === 'subjective') {
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
    compareAnswers(studentAnswer, correctAnswer, questionType) {
        if (!correctAnswer)
            return false;
        if (questionType === 'SINGLE_CHOICE') {
            return studentAnswer === correctAnswer;
        }
        else if (questionType === 'MULTIPLE_CHOICE') {
            try {
                const correct = JSON.parse(correctAnswer);
                const student = Array.isArray(studentAnswer) ? studentAnswer : [];
                return JSON.stringify(student.sort()) === JSON.stringify(correct.sort());
            }
            catch {
                return false;
            }
        }
        return false;
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AIService])
], ExamService);
//# sourceMappingURL=exam.service.js.map