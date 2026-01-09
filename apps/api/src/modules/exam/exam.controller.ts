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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
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
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
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

  // 学生管理API
  @Post(':id/students')
  @ApiOperation({ summary: 'Add a student to exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({ type: CreateExamStudentDto })
  @ApiResponse({ status: 201, description: 'Student added successfully' })
  addStudent(@Param('id') examId: string, @Body() dto: CreateExamStudentDto) {
    return this.examService.addStudent(examId, dto);
  }

  @Post(':id/students/batch')
  @ApiOperation({ summary: 'Batch add students to exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({ type: BatchCreateExamStudentsDto })
  @ApiResponse({ status: 201, description: 'Students added successfully' })
  batchAddStudents(@Param('id') examId: string, @Body() dto: BatchCreateExamStudentsDto) {
    return this.examService.batchAddStudents(examId, dto);
  }

  @Post(':id/students/generate')
  @ApiOperation({ summary: 'Generate student accounts for exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of accounts to generate' },
        prefix: { type: 'string', description: 'Username prefix', default: 'student' },
      },
      required: ['count'],
    },
  })
  @ApiResponse({ status: 201, description: 'Student accounts generated successfully' })
  generateStudentAccounts(
    @Param('id') examId: string,
    @Body() body: { count: number; prefix?: string },
  ) {
    return this.examService.generateStudentAccounts(examId, body.count, body.prefix);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get exam students' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  getExamStudents(@Param('id') examId: string) {
    return this.examService.getExamStudents(examId);
  }

  @Put(':id/students/:studentId')
  @ApiOperation({ summary: 'Update exam student' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiBody({ type: CreateExamStudentDto })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  updateExamStudent(
    @Param('id') examId: string,
    @Param('studentId') studentId: string,
    @Body() dto: Partial<CreateExamStudentDto>,
  ) {
    return this.examService.updateExamStudent(examId, studentId, dto);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Delete exam student' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  deleteExamStudent(@Param('id') examId: string, @Param('studentId') studentId: string) {
    return this.examService.deleteExamStudent(examId, studentId);
  }

  // 考试进行相关API
  @Get(':id/take')
  @ApiOperation({ summary: 'Get exam questions for taking exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam questions retrieved successfully' })
  getExamForTaking(@Param('id') examId: string) {
    return this.examService.getExamForTaking(examId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit exam answers' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answers: { type: 'object', description: 'Answers object with questionId as key' },
        examStudentId: { type: 'string', description: 'Exam student ID' },
      },
      required: ['answers', 'examStudentId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Exam submitted successfully' })
  async submitExam(
    @Param('id') examId: string,
    @Body() body: { answers: Record<string, any>; examStudentId: string },
  ) {
    // 异步处理提交，立即返回
    this.examService.submitExamAsync(examId, body.examStudentId, body.answers);
    return { message: '考试提交中，请等待评分完成', submissionId: `${examId}-${body.examStudentId}` };
  }

  @Get(':id/submit-progress/:examStudentId')
  @ApiOperation({ summary: 'Get submission progress via SSE' })
  async getSubmitProgress(
    @Param('id') examId: string,
    @Param('examStudentId') examStudentId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return this.examService.streamSubmissionProgress(examId, examStudentId, res);
  }

  @Get(':id/submission-status/:examStudentId')
  @ApiOperation({ summary: 'Check if student has submitted' })
  checkSubmissionStatus(
    @Param('id') examId: string,
    @Param('examStudentId') examStudentId: string,
  ) {
    return this.examService.checkSubmissionStatus(examId, examStudentId);
  }

  @Post(':id/save-answers')
  @ApiOperation({ summary: 'Save exam answers (auto-save)' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answers: { type: 'object', description: 'Answers object with questionId as key' },
        examStudentId: { type: 'string', description: 'Exam student ID' },
      },
      required: ['answers', 'examStudentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Answers saved successfully' })
  saveAnswers(
    @Param('id') examId: string,
    @Body() body: { answers: Record<string, any>; examStudentId: string },
  ) {
    return this.examService.saveAnswers(examId, body.examStudentId, body.answers);
  }

  // 评分相关API
  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get exam submissions for grading' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  getExamSubmissions(@Param('id') examId: string) {
    return this.examService.getExamSubmissions(examId);
  }

  @Post(':id/submissions/:submissionId/grade')
  @ApiOperation({ summary: 'Grade a submission' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scores: { type: 'object', description: 'Scores for each question' },
        totalScore: { type: 'number', description: 'Total score' },
        feedback: { type: 'string', description: 'Overall feedback' },
      },
      required: ['scores', 'totalScore'],
    },
  })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  gradeSubmission(
    @Param('id') examId: string,
    @Param('submissionId') submissionId: string,
    @Body() body: { scores: Record<string, number>; totalScore: number; feedback?: string },
  ) {
    return this.examService.gradeSubmission(submissionId, body.scores, body.totalScore, body.feedback);
  }

  @Post(':id/submissions/:submissionId/ai-grade')
  @ApiOperation({ summary: 'Get AI grading suggestions for subjective questions' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'AI grading suggestions retrieved' })
  getAIGradingSuggestions(
    @Param('id') examId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.examService.getAIGradingSuggestions(examId, submissionId);
  }
}
