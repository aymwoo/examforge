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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import { ImportProgressStore } from './import-progress.store';
import { ImportService } from './import.service';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly progressStore: ImportProgressStore
  ) {}

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
  async importPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.progressStore.createJob(jobId);

    void this.importService.importFromPdf(jobId, file.buffer);

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

    const sinceTime = since ? Number(since) : undefined;

    const writeEvents = () => {
      const events = this.progressStore.getEventsSince(jobId, sinceTime);
      for (const ev of events) {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
      }
    };

    writeEvents();

    const interval = setInterval(() => {
      writeEvents();
    }, 500);

    res.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  }
}
