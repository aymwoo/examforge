import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ClearQuestionsDto } from './dto/clear-questions.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('questions')
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions with pagination' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.questionService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  findById(@Param('id') id: string) {
    return this.questionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  delete(@Param('id') id: string) {
    return this.questionService.delete(id);
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple questions' })
  @ApiResponse({ status: 200, description: 'Questions deleted successfully' })
  deleteMany(@Body() body: { ids: string[] }) {
    return this.questionService.deleteMany(body.ids);
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Clear all questions (testing only)' })
  @ApiResponse({ status: 200, description: 'All questions cleared successfully' })
  clearAll(@Body() dto: ClearQuestionsDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('This operation is not allowed in production');
    }

    if (dto.confirm !== 'CLEAR_ALL') {
      throw new BadRequestException('Confirmation string invalid');
    }

    return this.questionService.clearAll();
  }
}
