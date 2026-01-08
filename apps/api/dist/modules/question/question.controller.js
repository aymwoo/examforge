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
exports.QuestionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const question_service_1 = require("./question.service");
const create_question_dto_1 = require("./dto/create-question.dto");
const update_question_dto_1 = require("./dto/update-question.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let QuestionController = class QuestionController {
    questionService;
    constructor(questionService) {
        this.questionService = questionService;
    }
    create(dto) {
        return this.questionService.create(dto);
    }
    findAll(paginationDto) {
        return this.questionService.findAll(paginationDto);
    }
    findById(id) {
        return this.questionService.findById(id);
    }
    update(id, dto) {
        return this.questionService.update(id, dto);
    }
    delete(id) {
        return this.questionService.delete(id);
    }
    deleteMany(body) {
        return this.questionService.deleteMany(body.ids);
    }
};
exports.QuestionController = QuestionController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new question' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Question created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_question_dto_1.CreateQuestionDto]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all questions with pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Questions retrieved successfully' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a question by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Question ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Question found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Question not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "findById", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a question' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Question ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Question updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_question_dto_1.UpdateQuestionDto]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a question' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Question ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Question deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('batch-delete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete multiple questions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Questions deleted successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuestionController.prototype, "deleteMany", null);
exports.QuestionController = QuestionController = __decorate([
    (0, swagger_1.ApiTags)('questions'),
    (0, common_1.Controller)('questions'),
    __metadata("design:paramtypes", [question_service_1.QuestionService])
], QuestionController);
//# sourceMappingURL=question.controller.js.map