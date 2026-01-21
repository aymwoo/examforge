import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiProgressStore } from './ai-progress.store';
import type { Response } from 'express';

class TestConnectionDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  testApiKey?: string;

  @IsOptional()
  @IsString()
  testBaseUrl?: string;

  @IsOptional()
  @IsString()
  testModel?: string;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly progressStore: AiProgressStore
  ) {}

  @Post('test')
  @ApiOperation({ summary: 'Test AI connection with a simple message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        testApiKey: { type: 'string' },
        testBaseUrl: { type: 'string' },
        testModel: { type: 'string' },
      },
    },
  })
  async testConnection(@Body() dto: TestConnectionDto, @Req() req: any) {
    return this.aiService.testConnection(
      dto.message,
      req.user?.id,
      dto.testApiKey,
      dto.testBaseUrl,
      dto.testModel
    );
  }

  @Post('generate-questions')
  @ApiOperation({ summary: 'Generate exam questions from uploaded exam image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are allowed (JPEG, PNG, WebP)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  async generateQuestions(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    return this.aiService.generateExamQuestions(file.buffer);
  }

  @Post('generate-questions-json')
  @ApiOperation({ summary: 'Generate exam questions in JSON format based on parameters' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt to generate questions',
        },
        count: {
          type: 'number',
          description: 'Number of questions to generate',
          default: 5,
        },
      },
      required: ['prompt'],
    },
  })
  async generateQuestionsJson(@Body() body: { prompt: string; count?: number }, @Req() req: any) {
    const { prompt, count = 5 } = body;

    // 使用AI服务生成题目
    const result = await this.aiService.generateQuestionsFromText(prompt, {
      userId: req.user?.id,
      customPrompt: prompt,
    });

    // 确保只返回指定数量的题目
    const limitedQuestions = result.questions.slice(0, count);

    return { questions: limitedQuestions };
  }

  @Post('generate-questions-json-stream')
  @ApiOperation({ summary: 'Generate exam questions in JSON format with progress streaming' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt to generate questions',
        },
        count: {
          type: 'number',
          description: 'Number of questions to generate',
          default: 5,
        },
      },
      required: ['prompt'],
    },
  })
  async generateQuestionsJsonStream(
    @Body() body: { prompt: string; count?: number },
    @Req() req: any,
    @Res() res: Response
  ) {
    const { prompt, count = 5 } = body;

    // 创建任务ID
    const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // 初始化进度存储
    this.progressStore.createJob(jobId);

    // 发送任务ID给客户端并结束响应
    res.json({ jobId });

    // 异步执行AI生成任务（在响应发送后）
    void this.aiService.generateQuestionsFromTextWithProgress(
      jobId,
      prompt,
      {
        userId: req.user?.id,
        customPrompt: prompt,
        count: count,
      },
      this.progressStore
    );
  }

  @Get('generate-questions-json-stream/progress/:jobId')
  @ApiOperation({ summary: 'Get AI generation progress (supports both SSE and regular polling)' })
  @UseGuards(JwtAuthGuard)
  async getAiGenerationProgress(
    @Res() res: Response,
    @Param('jobId') jobId: string,
    @Req() req: any,
    @Query('since') since?: string,
    @Query('format') format?: string // 添加format参数来区分SSE和普通请求
  ) {
    // 验证用户是否有权访问此任务的进度
    // 这里可以根据具体业务逻辑实现权限检查
    // 比如检查任务是否属于当前用户等
    // req.user 应该包含已认证的用户信息

    // 如果客户端请求的是JSON格式（轮询方式），则返回JSON
    if (format === 'json' || req.headers.accept?.includes('application/json')) {
      const sinceTime = since ? Number(since) : undefined;
      const events = this.progressStore.getEventsSince(jobId, sinceTime);
      return res.json(events);
    }

    // 否则使用SSE流
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
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

    // Initial ping to keep connection alive.
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
