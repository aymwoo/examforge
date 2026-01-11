import { IsString, IsNotEmpty, IsEnum, IsArray, IsOptional, IsInt, Min, Max, MaxLength, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@/common/enums/question.enum';

export class OptionDto {
  @ApiProperty({ description: 'Option label (A, B, C, D, etc.)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Option content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({ enum: QuestionType, description: 'Question type' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ type: [OptionDto], required: false, description: 'Options for choice questions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  @IsOptional()
  options?: OptionDto[];

  @ApiProperty({ required: false, description: 'Correct answer' })
  @IsString()
  @IsOptional()
  answer?: string;

  @ApiProperty({ required: false, description: 'Explanation of the answer' })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ required: false, description: 'Question illustration (image URL or base64)' })
  @IsString()
  @IsOptional()
  illustration?: string;

  @ApiProperty({ type: [String], required: false, description: 'Question images array' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: [String], required: false, description: 'Question tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, description: 'Difficulty level (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficulty?: number;

  @ApiProperty({ required: false, description: 'Knowledge point' })
  @IsString()
  @IsOptional()
  knowledgePoint?: string;

  @ApiProperty({ required: false, description: 'Whether the question is public', default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], required: false, description: 'Question status', default: 'DRAFT' })
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  @IsOptional()
  status?: string;
}
