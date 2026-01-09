import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name: string;
}
