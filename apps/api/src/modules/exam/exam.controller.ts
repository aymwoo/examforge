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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AIService } from '../ai/ai.service';

@ApiTags('exams')
@Controller('exams')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly aiService: AIService,
  ) {}

  @Post('generate-from-ai')
  @ApiOperation({ summary: 'Generate exam questions from uploaded image using AI' })
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
  async generateFromAI(@Body('image') body: { image: string }) {
    return this.aiService.generateExamQuestionsFromImage(body.image);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  create(@Body() dto: CreateExamDto) {
    return this.examService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams with pagination' })
  @ApiResponse({ status: 200, description: 'Exams retrieved successfully' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.examService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exam by ID with questions' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam found' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  findById(@Param('id') id: string) {
    return this.examService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 204, description: 'Exam deleted successfully' })
  delete(@Param('id') id: string) {
    return this.examService.delete(id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a question to an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  addQuestion(@Param('id') examId: string, @Body() dto: AddQuestionDto) {
    return this.examService.addQuestion(examId, dto);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a question from an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question removed successfully' })
  removeQuestion(@Param('id') examId: string, @Param('questionId') questionId: string) {
    return this.examService.removeQuestion(examId, questionId);
  }

  @Put(':id/questions/:questionId')
  @ApiOperation({ summary: 'Update question order and score in exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  updateQuestionOrder(
    @Param('id') examId: string,
    @Param('questionId') questionId: string,
    @Body() body: { order: number; score?: number },
  ) {
    return this.examService.updateQuestionOrder(examId, questionId, body.order, body.score);
  }
}
