"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const question_module_1 = require("./modules/question/question.module");
const import_module_1 = require("./modules/import/import.module");
const exam_module_1 = require("./modules/exam/exam.module");
const settings_module_1 = require("./modules/settings/settings.module");
const ai_module_1 = require("./modules/ai/ai.module");
const submission_module_1 = require("./modules/submission/submission.module");
const debug_module_1 = require("./modules/debug/debug.module");
const auth_module_1 = require("./modules/auth/auth.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            question_module_1.QuestionModule,
            import_module_1.ImportModule,
            exam_module_1.ExamModule,
            settings_module_1.SettingsModule,
            ai_module_1.AIModule,
            submission_module_1.SubmissionModule,
            debug_module_1.DebugModule,
            auth_module_1.AuthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map