import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class StudentAiAnalysisQueryDto {
  @ApiProperty({ description: 'Exam ID' })
  @IsString()
  examId: string;

  @ApiProperty({ description: 'Submission ID' })
  @IsString()
  submissionId: string;

  @ApiProperty({ required: false, description: 'Force regenerate report' })
  @IsOptional()
  @IsBooleanString()
  force?: string;
}
