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
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importService.importFromExcel(file.buffer);
  }

  @Post('pdf')
  @ApiOperation({ summary: 'Import questions from PDF using AI' })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'PDF import mode: text | vision | file (default: vision for qwen; otherwise text)',
    schema: { type: 'string', enum: ['text', 'vision', 'file'] },
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
        const allowedMimes = ['application/pdf'];
        const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || fileExt === '.pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
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
  async importPdf(@UploadedFile() file: Express.Multer.File, @Query('mode') mode?: string, @Query('prompt') prompt?: string, @Req() req?: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.progressStore.createJob(jobId);

    void this.importService.importFromPdf(jobId, file.buffer, mode, req?.user?.id, prompt);

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
}
