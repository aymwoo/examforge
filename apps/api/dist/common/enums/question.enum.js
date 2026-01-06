"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionStatus = exports.QuestionType = void 0;
var QuestionType;
(function (QuestionType) {
    QuestionType["SINGLE_CHOICE"] = "SINGLE_CHOICE";
    QuestionType["MULTIPLE_CHOICE"] = "MULTIPLE_CHOICE";
    QuestionType["TRUE_FALSE"] = "TRUE_FALSE";
    QuestionType["FILL_BLANK"] = "FILL_BLANK";
    QuestionType["ESSAY"] = "ESSAY";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var QuestionStatus;
(function (QuestionStatus) {
    QuestionStatus["DRAFT"] = "DRAFT";
    QuestionStatus["PUBLISHED"] = "PUBLISHED";
    QuestionStatus["ARCHIVED"] = "ARCHIVED";
})(QuestionStatus || (exports.QuestionStatus = QuestionStatus = {}));
//# sourceMappingURL=question.enum.js.map