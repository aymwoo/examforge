"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const ai_service_1 = require("../ai/ai.service");
const settings_service_1 = require("../settings/settings.service");
const import_controller_1 = require("./import.controller");
const import_progress_store_1 = require("./import-progress.store");
const import_service_1 = require("./import.service");
let ImportModule = class ImportModule {
};
exports.ImportModule = ImportModule;
exports.ImportModule = ImportModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.memoryStorage)(),
            }),
        ],
        controllers: [import_controller_1.ImportController],
        providers: [import_service_1.ImportService, import_progress_store_1.ImportProgressStore, ai_service_1.AIService, settings_service_1.SettingsService],
        exports: [import_service_1.ImportService],
    })
], ImportModule);
//# sourceMappingURL=import.module.js.map