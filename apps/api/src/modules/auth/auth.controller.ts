import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/login.dto';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    if (result.access_token) {
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: false, // Allow HTTP for development/testing
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    if (result.access_token) {
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: false, // Allow HTTP for development/testing
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: false, // Allow HTTP for development/testing
      sameSite: 'lax',
    });
    return { message: 'Logged out' };
  }

  @Get('check-first-user')
  @ApiOperation({ summary: 'Check if this would be the first user registration' })
  @ApiResponse({ status: 200, description: 'Returns whether this is the first user' })
  checkFirstUser() {
    return this.authService.checkFirstUser();
  }
}
