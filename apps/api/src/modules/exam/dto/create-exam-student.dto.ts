import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamStudentDto {
  @ApiProperty({ description: 'Student username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Student password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false, description: 'Student display name' })
  @IsString()
  @IsOptional()
  displayName?: string;
}
