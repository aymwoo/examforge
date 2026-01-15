import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Param,
  Query,
  Res,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import { ImportProgressStore } from './import-progress.store';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly progressStore: ImportProgressStore
  ) {}

  @Post('pdf/create-exam')
  @ApiOperation({ summary: 'Create exam from imported PDF questions' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Import job ID' },
        examTitle: { type: 'string', description: 'Exam title' },
        duration: { type: 'number', description: 'Exam duration in minutes', default: 60 },
      },
      required: ['jobId', 'examTitle'],
    },
  })
  async createExamFromPdf(@Body() body: { jobId: string; examTitle: string; duration?: number }) {
    const progress = this.importService.getProgress(body.jobId);
    const lastEvent = progress[progress.length - 1];

    const questionIds = (lastEvent?.meta as any)?.questionIds as string[] | undefined;

    if (!lastEvent || lastEvent.stage !== 'done' || !questionIds || questionIds.length === 0) {
      throw new BadRequestException('Import not completed or no questions found');
    }

    const examId = await this.importService.createExamFromImport(
      body.jobId,
      questionIds,
      body.examTitle,
      body.duration || 60
    );

    return { examId, message: 'Exam created successfully' };
  }

  @Post('json')
  @ApiOperation({ summary: 'Import questions from JSON data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stem: { type: 'string', description: '题目内容' },
              type: { type: 'string', description: '题目类型', enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY'] },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: '选项列表（选择题必需）'
              },
              answer: {
                type: 'string',
                description: '答案，对于多选题可以是数组，判断题可以是布尔值'
              },
              explanation: { type: 'string', description: '解析' },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: '标签列表'
              },
              difficulty: { type: 'number', description: '难度（1-5）', minimum: 1, maximum: 5 },
              knowledgePoint: { type: 'string', description: '知识点' }
            },
            required: ['stem']
          }
        }
      },
      required: ['questions']
    }
  })
  async importJson(@Body() body: { questions: any[] }, @Req() req: any) {
    if (!body.questions) {
      throw new BadRequestException('Missing questions in request body');
    }
    return this.importService.importFromJson(body.questions, req.user?.id);
  }

  @Post('excel')
  @ApiOperation({ summary: 'Import questions from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
          'application/octet-stream', // Some browsers send this for xlsx
        ];
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only Excel and CSV files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importService.importFromExcel(file.buffer, req.user?.id);
  }

  @Post('pdf')
  @ApiOperation({ summary: 'Import questions from PDF using AI' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'PDF import mode: text | vision | file (default: vision for qwen; otherwise text)',
    schema: { type: 'string', enum: ['text', 'vision', 'file'] },
  })
  @ApiQuery({
    name: 'cropTop',
    required: false,
    description: 'Crop top percentage (0-100) to remove header',
    schema: { type: 'number', minimum: 0, maximum: 100 },
  })
  @ApiQuery({
    name: 'cropBottom',
    required: false,
    description: 'Crop bottom percentage (0-100) to remove footer',
    schema: { type: 'number', minimum: 0, maximum: 100 },
  })
  @ApiQuery({
    name: 'stitchPages',
    required: false,
    description: 'Stitch all pages into one image',
    schema: { type: 'boolean' },
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp'
        ];
        const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

        if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and image files (JPG, PNG, GIF, WebP) are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  @ApiQuery({
    name: 'prompt',
    required: false,
    description: 'Custom AI prompt template for this import',
    schema: { type: 'string' },
  })
  async importPdf(
    @UploadedFile() file: Express.Multer.File, 
    @Query('mode') mode?: string, 
    @Query('prompt') prompt?: string,
    @Query('cropTop') cropTop?: number,
    @Query('cropBottom') cropBottom?: number,
    @Query('stitchPages') stitchPages?: boolean,
    @Req() req?: any
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.progressStore.createJob(jobId);

    const imageProcessingOptions = {
      cropTop: cropTop ? Number(cropTop) : undefined,
      cropBottom: cropBottom ? Number(cropBottom) : undefined,
      stitchPages: stitchPages === true || String(stitchPages) === 'true',
    };

    void this.importService.importFromPdf(
      jobId, 
      file.buffer, 
      mode, 
      req?.user?.id, 
      prompt, 
      file.originalname,
      imageProcessingOptions
    );

    return { jobId };
  }

  @Get('pdf/progress/:jobId')
  @ApiOperation({ summary: 'Stream PDF import progress events (SSE)' })
  async pdfImportProgress(
    @Res() res: Response,
    @Param('jobId') jobId: string,
    @Query('since') since?: string
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Avoid proxy buffering which can look like a dropped connection.
    res.setHeader('X-Accel-Buffering', 'no');

    // Immediately flush headers so browser keeps the SSE open.
    res.flushHeaders?.();

    const sinceTime = since ? Number(since) : undefined;

    const writeEvents = () => {
      const events = this.progressStore.getEventsSince(jobId, sinceTime);
      for (const ev of events) {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
      }
    };

    // Initial ping to keep intermediaries from closing the stream.
    res.write(`: connected\n\n`);

    writeEvents();

    const interval = setInterval(() => {
      writeEvents();
      // Comment ping to keep connection alive even when idle.
      res.write(`: ping ${Date.now()}\n\n`);
    }, 1000);

    res.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }

  @Post('history/:jobId/create-exam')
  @ApiOperation({ summary: 'Create exam from import record' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        examTitle: { type: 'string', description: 'Exam title' },
        duration: { type: 'number', description: 'Exam duration in minutes', default: 60 },
      },
      required: ['examTitle'],
    },
  })
  async createExamFromImportRecord(
    @Param('jobId') jobId: string,
    @Body() body: { examTitle: string; duration?: number },
    @Req() req: any
  ) {
    return this.importService.createExamFromImportRecord(
      jobId,
      body.examTitle,
      body.duration || 60,
      req.user?.id
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get import history' })
  async getImportHistory(@Req() req: any) {
    return this.importService.getImportHistory(req.user?.id);
  }

  @Get('history/:jobId')
  @ApiOperation({ summary: 'Get import record details' })
  async getImportRecord(@Param('jobId') jobId: string, @Req() req: any) {
    return this.importService.getImportRecord(jobId, req.user?.id);
  }

  @Get('history/:jobId/pdf-images')
  @ApiOperation({ summary: 'Get PDF images from import record' })
  async getPdfImages(@Param('jobId') jobId: string, @Req() req: any) {
    return this.importService.getPdfImages(jobId, req.user?.id);
  }

  @Get('question/:questionId/import-record')
  @ApiOperation({ summary: 'Get import record for a specific question' })
  async getQuestionImportRecord(@Param('questionId') questionId: string, @Req() req: any) {
    return this.importService.getQuestionImportRecord(questionId, req.user?.id);
  }
}
