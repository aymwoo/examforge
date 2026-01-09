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
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ClearQuestionsDto } from './dto/clear-questions.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  create(@Body() dto: CreateQuestionDto, @Request() req) {
    return this.questionService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all questions with pagination' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  findAll(@Query() paginationDto: PaginationDto, @Request() req) {
    return this.questionService.findAll(paginationDto, req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  findById(@Param('id') id: string, @Request() req) {
    return this.questionService.findById(id, req.user.id, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto, @Request() req) {
    return this.questionService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  delete(@Param('id') id: string, @Request() req) {
    return this.questionService.delete(id, req.user.id, req.user.role);
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
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
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
