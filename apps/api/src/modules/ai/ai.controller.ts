import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { memoryStorage } from 'multer';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class TestConnectionDto {
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('test')
  @ApiOperation({ summary: 'Test AI connection with a simple message' })
  @ApiBody({ schema: { type: 'object', properties: { message: { type: 'string' } } } })
  async testConnection(@Body() dto: TestConnectionDto, @Req() req: any) {
    return this.aiService.testConnection(dto.message, req.user?.id);
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
