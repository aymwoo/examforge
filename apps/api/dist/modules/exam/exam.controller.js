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
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let ExamController = class ExamController {
    examService;
    constructor(examService) {
        this.examService = examService;
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
};
exports.ExamController = ExamController;
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
exports.ExamController = ExamController = __decorate([
    (0, swagger_1.ApiTags)('exams'),
    (0, common_1.Controller)('exams'),
    __metadata("design:paramtypes", [exam_service_1.ExamService])
], ExamController);
//# sourceMappingURL=exam.controller.js.map