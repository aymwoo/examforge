import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';

class TestConnectionDto {
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('ai')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('test')
  @ApiOperation({ summary: 'Test AI connection with a simple message' })
  @ApiBody({ schema: { type: 'object', properties: { message: { type: 'string' } } } })
  async testConnection(@Body() dto: TestConnectionDto) {
    return this.aiService.testConnection(dto.message);
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
}
