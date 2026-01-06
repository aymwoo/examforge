import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateExamDto } from './create-exam.dto';
import { IsEnum } from 'class-validator';

export class UpdateExamDto extends PartialType(CreateExamDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], description: 'Exam status' })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
