import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'User answer' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CreateSubmissionDto {
  @ApiProperty({ type: [AnswerDto], description: 'Array of answers' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @ApiProperty({ required: false, description: 'Submitter name or identifier' })
  @IsString()
  @IsOptional()
  submitter?: string;
}
