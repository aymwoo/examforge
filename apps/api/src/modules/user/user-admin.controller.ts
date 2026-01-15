import { Controller, Get, Patch, Param, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get('pending-approval')
  @ApiOperation({ summary: 'Get users awaiting approval' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved pending users.' })
  @Roles('ADMIN')
  async getPendingApprovalUsers(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.userService.findPendingApprovalUsers(page, limit);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User approved successfully.' })
  @Roles('ADMIN')
  async approveUser(@Param('id') id: string) {
    return this.userService.approveUser(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User rejected successfully.' })
  @Roles('ADMIN')
  async rejectUser(@Param('id') id: string) {
    return this.userService.rejectUser(id);
  }
}