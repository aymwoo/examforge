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
exports.UpdateQuestionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_question_dto_1 = require("./create-question.dto");
const swagger_2 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const question_enum_1 = require("../../../common/enums/question.enum");
class UpdateQuestionDto extends (0, swagger_1.PartialType)(create_question_dto_1.CreateQuestionDto) {
    status;
}
exports.UpdateQuestionDto = UpdateQuestionDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: question_enum_1.QuestionStatus, description: 'Question status' }),
    (0, class_validator_1.IsEnum)(question_enum_1.QuestionStatus),
    __metadata("design:type", String)
], UpdateQuestionDto.prototype, "status", void 0);
//# sourceMappingURL=update-question.dto.js.map