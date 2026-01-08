import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExamLoginDto {
  @ApiProperty({ description: 'Exam ID' })
  @IsString()
  @IsNotEmpty()
  examId: string;

  @ApiProperty({ description: 'Student username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Student password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
