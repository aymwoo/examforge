import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string
  ) {
    return this.userService.findAll(page ? parseInt(page) : 1, limit ? parseInt(limit) : 10, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateProfile(req.user.id, updateUserDto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change user password' })
  changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.userService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Patch(':id/reset-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset user password (admin only)' })
  resetUserPassword(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { newPassword: string }
  ) {
    // 检查用户是否为管理员
    if (req.user.role !== 'ADMIN') {
      throw new Error("Only administrators can reset other users' passwords");
    }
    return this.userService.resetUserPassword(id, body.newPassword);
  }
}
