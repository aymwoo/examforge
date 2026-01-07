import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionPaginationDto } from './dto/submission-pagination.dto';

@ApiTags('submissions')
@Controller('exams/:examId/submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @ApiOperation({ summary: 'Submit exam answers' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  create(@Param('examId') examId: string, @Body() dto: CreateSubmissionDto) {
    return this.submissionService.create(examId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions for an exam' })
  @ApiParam({ name: 'examId', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  findAll(@Param('examId') examId: string, @Query() paginationDto: SubmissionPaginationDto) {
    return this.submissionService.findByExam(examId, paginationDto);
  }
}

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a submission by ID with detailed results' })
  @ApiParam({ name: 'id', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  findById(@Param('id') id: string) {
    return this.submissionService.findById(id);
  }
}
