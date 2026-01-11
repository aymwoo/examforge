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
exports.ImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const import_progress_store_1 = require("./import-progress.store");
const import_service_1 = require("./import.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ImportController = class ImportController {
    importService;
    progressStore;
    constructor(importService, progressStore) {
        this.importService = importService;
        this.progressStore = progressStore;
    }
    async createExamFromPdf(body) {
        const progress = this.importService.getProgress(body.jobId);
        const lastEvent = progress[progress.length - 1];
        const questionIds = lastEvent?.meta?.questionIds;
        if (!lastEvent || lastEvent.stage !== 'done' || !questionIds || questionIds.length === 0) {
            throw new common_1.BadRequestException('Import not completed or no questions found');
        }
        const examId = await this.importService.createExamFromImport(body.jobId, questionIds, body.examTitle, body.duration || 60);
        return { examId, message: 'Exam created successfully' };
    }
    async importExcel(file) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        return this.importService.importFromExcel(file.buffer);
    }
    async importPdf(file, mode, prompt, req) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        this.progressStore.createJob(jobId);
        void this.importService.importFromPdf(jobId, file.buffer, mode, req?.user?.id, prompt, file.originalname);
        return { jobId };
    }
    async pdfImportProgress(res, jobId, since) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();
        const sinceTime = since ? Number(since) : undefined;
        const writeEvents = () => {
            const events = this.progressStore.getEventsSince(jobId, sinceTime);
            for (const ev of events) {
                res.write(`data: ${JSON.stringify(ev)}\n\n`);
            }
        };
        res.write(`: connected\n\n`);
        writeEvents();
        const interval = setInterval(() => {
            writeEvents();
            res.write(`: ping ${Date.now()}\n\n`);
        }, 1000);
        res.on('close', () => {
            clearInterval(interval);
            res.end();
        });
    }
    async getImportHistory(req) {
        return this.importService.getImportHistory(req.user?.id);
    }
    async getImportRecord(jobId, req) {
        return this.importService.getImportRecord(jobId, req.user?.id);
    }
    async getPdfImages(jobId, req) {
        return this.importService.getPdfImages(jobId, req.user?.id);
    }
};
exports.ImportController = ImportController;
__decorate([
    (0, common_1.Post)('pdf/create-exam'),
    (0, swagger_1.ApiOperation)({ summary: 'Create exam from imported PDF questions' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                jobId: { type: 'string', description: 'Import job ID' },
                examTitle: { type: 'string', description: 'Exam title' },
                duration: { type: 'number', description: 'Exam duration in minutes', default: 60 },
            },
            required: ['jobId', 'examTitle'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "createExamFromPdf", null);
__decorate([
    (0, common_1.Post)('excel'),
    (0, swagger_1.ApiOperation)({ summary: 'Import questions from Excel file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (_req, file, cb) => {
            const allowedMimes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv',
                'application/csv',
                'application/octet-stream',
            ];
            const allowedExtensions = ['.xlsx', '.xls', '.csv'];
            const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
            if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only Excel and CSV files are allowed'), false);
            }
        },
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importExcel", null);
__decorate([
    (0, common_1.Post)('pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Import questions from PDF using AI' }),
    (0, swagger_1.ApiQuery)({
        name: 'mode',
        required: false,
        description: 'PDF import mode: text | vision | file (default: vision for qwen; otherwise text)',
        schema: { type: 'string', enum: ['text', 'vision', 'file'] },
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        fileFilter: (_req, file, cb) => {
            const allowedMimes = ['application/pdf'];
            const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
            if (allowedMimes.includes(file.mimetype) || fileExt === '.pdf') {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only PDF files are allowed'), false);
            }
        },
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    (0, swagger_1.ApiQuery)({
        name: 'prompt',
        required: false,
        description: 'Custom AI prompt template for this import',
        schema: { type: 'string' },
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('mode')),
    __param(2, (0, common_1.Query)('prompt')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "importPdf", null);
__decorate([
    (0, common_1.Get)('pdf/progress/:jobId'),
    (0, swagger_1.ApiOperation)({ summary: 'Stream PDF import progress events (SSE)' }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)('jobId')),
    __param(2, (0, common_1.Query)('since')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "pdfImportProgress", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get import history' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "getImportHistory", null);
__decorate([
    (0, common_1.Get)('history/:jobId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get import record details' }),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "getImportRecord", null);
__decorate([
    (0, common_1.Get)('history/:jobId/pdf-images'),
    (0, swagger_1.ApiOperation)({ summary: 'Get PDF images from import record' }),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "getPdfImages", null);
exports.ImportController = ImportController = __decorate([
    (0, swagger_1.ApiTags)('import'),
    (0, common_1.Controller)('import'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [import_service_1.ImportService,
        import_progress_store_1.ImportProgressStore])
], ImportController);
//# sourceMappingURL=import.controller.js.map