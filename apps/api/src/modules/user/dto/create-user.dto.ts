import { IsString, IsEmail, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Full name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User role', enum: ['ADMIN', 'TEACHER', 'STUDENT'] })
  @IsIn(['ADMIN', 'TEACHER', 'STUDENT'])
  role: string;

  @ApiProperty({ description: 'Is user active', default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Has user been approved', default: false })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
