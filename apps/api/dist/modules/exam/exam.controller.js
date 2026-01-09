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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const exam_service_1 = require("./exam.service");
const create_exam_dto_1 = require("./dto/create-exam.dto");
const update_exam_dto_1 = require("./dto/update-exam.dto");
const add_question_dto_1 = require("./dto/add-question.dto");
const create_exam_student_dto_1 = require("./dto/create-exam-student.dto");
const batch_create_exam_students_dto_1 = require("./dto/batch-create-exam-students.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const ai_service_1 = require("../ai/ai.service");
let ExamController = class ExamController {
    examService;
    aiService;
    constructor(examService, aiService) {
        this.examService = examService;
        this.aiService = aiService;
    }
    async generateFromAI(body) {
        return this.aiService.generateExamQuestionsFromImage(body.image);
    }
    create(dto) {
        return this.examService.create(dto);
    }
    findAll(paginationDto) {
        return this.examService.findAll(paginationDto);
    }
    findById(id) {
        return this.examService.findById(id);
    }
    update(id, dto) {
        return this.examService.update(id, dto);
    }
    delete(id) {
        return this.examService.delete(id);
    }
    addQuestion(examId, dto) {
        return this.examService.addQuestion(examId, dto);
    }
    removeQuestion(examId, questionId) {
        return this.examService.removeQuestion(examId, questionId);
    }
    updateQuestionOrder(examId, questionId, body) {
        return this.examService.updateQuestionOrder(examId, questionId, body.order, body.score);
    }
    addStudent(examId, dto) {
        return this.examService.addStudent(examId, dto);
    }
    batchAddStudents(examId, dto) {
        return this.examService.batchAddStudents(examId, dto);
    }
    generateStudentAccounts(examId, body) {
        return this.examService.generateStudentAccounts(examId, body.count, body.prefix);
    }
    getExamStudents(examId) {
        return this.examService.getExamStudents(examId);
    }
    updateExamStudent(examId, studentId, dto) {
        return this.examService.updateExamStudent(examId, studentId, dto);
    }
    deleteExamStudent(examId, studentId) {
        return this.examService.deleteExamStudent(examId, studentId);
    }
    getExamForTaking(examId) {
        return this.examService.getExamForTaking(examId);
    }
    async submitExam(examId, body) {
        this.examService.submitExamAsync(examId, body.examStudentId, body.answers);
        return { message: '考试提交中，请等待评分完成', submissionId: `${examId}-${body.examStudentId}` };
    }
    async getSubmitProgress(examId, examStudentId, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return this.examService.streamSubmissionProgress(examId, examStudentId, res);
    }
    checkSubmissionStatus(examId, examStudentId) {
        return this.examService.checkSubmissionStatus(examId, examStudentId);
    }
    saveAnswers(examId, body) {
        return this.examService.saveAnswers(examId, body.examStudentId, body.answers);
    }
    getExamSubmissions(examId) {
        return this.examService.getExamSubmissions(examId);
    }
    gradeSubmission(examId, submissionId, body) {
        return this.examService.gradeSubmission(submissionId, body.scores, body.totalScore, body.feedback);
    }
    getAIGradingSuggestions(examId, submissionId) {
        return this.examService.getAIGradingSuggestions(examId, submissionId);
    }
};
exports.ExamController = ExamController;
__decorate([
    (0, common_1.Post)('generate-from-ai'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate exam questions from uploaded image using AI' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    __param(0, (0, common_1.Body)('image')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExamController.prototype, "generateFromAI", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new exam' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Exam created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_exam_dto_1.CreateExamDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all exams with pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Exams retrieved successfully' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an exam by ID with questions' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Exam found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Exam not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "findById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Exam updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_exam_dto_1.UpdateExamDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Exam deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/questions'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a question to an exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Question added successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_question_dto_1.AddQuestionDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "addQuestion", null);
__decorate([
    (0, common_1.Delete)(':id/questions/:questionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a question from an exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'questionId', description: 'Question ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Question removed successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('questionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "removeQuestion", null);
__decorate([
    (0, common_1.Put)(':id/questions/:questionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update question order and score in exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'questionId', description: 'Question ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Question updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('questionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "updateQuestionOrder", null);
__decorate([
    (0, common_1.Post)(':id/students'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a student to exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiBody)({ type: create_exam_student_dto_1.CreateExamStudentDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Student added successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_exam_student_dto_1.CreateExamStudentDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "addStudent", null);
__decorate([
    (0, common_1.Post)(':id/students/batch'),
    (0, swagger_1.ApiOperation)({ summary: 'Batch add students to exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiBody)({ type: batch_create_exam_students_dto_1.BatchCreateExamStudentsDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Students added successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, batch_create_exam_students_dto_1.BatchCreateExamStudentsDto]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "batchAddStudents", null);
__decorate([
    (0, common_1.Post)(':id/students/generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate student accounts for exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                count: { type: 'number', description: 'Number of accounts to generate' },
                prefix: { type: 'string', description: 'Username prefix', default: 'student' },
            },
            required: ['count'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Student accounts generated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "generateStudentAccounts", null);
__decorate([
    (0, common_1.Get)(':id/students'),
    (0, swagger_1.ApiOperation)({ summary: 'Get exam students' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Students retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "getExamStudents", null);
__decorate([
    (0, common_1.Put)(':id/students/:studentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update exam student' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'studentId', description: 'Student ID' }),
    (0, swagger_1.ApiBody)({ type: create_exam_student_dto_1.CreateExamStudentDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Student updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "updateExamStudent", null);
__decorate([
    (0, common_1.Delete)(':id/students/:studentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete exam student' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'studentId', description: 'Student ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Student deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "deleteExamStudent", null);
__decorate([
    (0, common_1.Get)(':id/take'),
    (0, swagger_1.ApiOperation)({ summary: 'Get exam questions for taking exam' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Exam questions retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "getExamForTaking", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit exam answers' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                answers: { type: 'object', description: 'Answers object with questionId as key' },
                examStudentId: { type: 'string', description: 'Exam student ID' },
            },
            required: ['answers', 'examStudentId'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Exam submitted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExamController.prototype, "submitExam", null);
__decorate([
    (0, common_1.Get)(':id/submit-progress/:examStudentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get submission progress via SSE' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('examStudentId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ExamController.prototype, "getSubmitProgress", null);
__decorate([
    (0, common_1.Get)(':id/submission-status/:examStudentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if student has submitted' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('examStudentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "checkSubmissionStatus", null);
__decorate([
    (0, common_1.Post)(':id/save-answers'),
    (0, swagger_1.ApiOperation)({ summary: 'Save exam answers (auto-save)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                answers: { type: 'object', description: 'Answers object with questionId as key' },
                examStudentId: { type: 'string', description: 'Exam student ID' },
            },
            required: ['answers', 'examStudentId'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Answers saved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "saveAnswers", null);
__decorate([
    (0, common_1.Get)(':id/submissions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get exam submissions for grading' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Submissions retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "getExamSubmissions", null);
__decorate([
    (0, common_1.Post)(':id/submissions/:submissionId/grade'),
    (0, swagger_1.ApiOperation)({ summary: 'Grade a submission' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'submissionId', description: 'Submission ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                scores: { type: 'object', description: 'Scores for each question' },
                totalScore: { type: 'number', description: 'Total score' },
                feedback: { type: 'string', description: 'Overall feedback' },
            },
            required: ['scores', 'totalScore'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Submission graded successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('submissionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "gradeSubmission", null);
__decorate([
    (0, common_1.Post)(':id/submissions/:submissionId/ai-grade'),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI grading suggestions for subjective questions' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Exam ID' }),
    (0, swagger_1.ApiParam)({ name: 'submissionId', description: 'Submission ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'AI grading suggestions retrieved' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamController.prototype, "getAIGradingSuggestions", null);
exports.ExamController = ExamController = __decorate([
    (0, swagger_1.ApiTags)('exams'),
    (0, common_1.Controller)('exams'),
    __metadata("design:paramtypes", [exam_service_1.ExamService,
        ai_service_1.AIService])
], ExamController);
//# sourceMappingURL=exam.controller.js.map