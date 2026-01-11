import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateExamDto, ExamAccountMode } from './create-exam.dto';
import { IsEnum, IsArray, IsOptional, ArrayNotEmpty, IsIn } from 'class-validator';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], description: 'Exam status' })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @ApiPropertyOptional({ 
    type: [String],
    enum: ExamAccountMode,
    description: 'Account modes for exam (array)'
  })
  @IsArray()
  @IsOptional()
  @IsIn(Object.values(ExamAccountMode), { each: true })
  accountModes?: ExamAccountMode[];
}
