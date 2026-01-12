import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ description: '班级名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '班级代码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: '班级描述' })
  @IsString()
  @IsOptional()
  description?: string;
}
