import { Controller, Get, Post, Body, Param, Delete, Put, Query, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('user-admin')
@Controller('admin/users')
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get('pending-approval')
  @ApiOperation({ summary: '获取待审核用户列表' })
  @ApiResponse({ status: 200, description: '返回待审核用户列表' })
  async getPendingApprovalUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.userService.findPendingApprovalUsers(+page, +limit);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: '批准用户' })
  @ApiResponse({ status: 200, description: '用户已批准' })
  async approveUser(@Param('id') id: string) {
    return this.userService.approveUser(id);
  }

  @Delete(':id/reject')
  @ApiOperation({ summary: '拒绝用户' })
  @ApiResponse({ status: 200, description: '用户已拒绝' })
  async rejectUser(@Param('id') id: string) {
    return this.userService.rejectUser(id);
  }

  @Post('batch-approve')
  @ApiOperation({ summary: '批量批准用户' })
  @ApiResponse({ status: 200, description: '用户已批量批准' })
  async batchApproveUsers(@Body('ids') ids: string[]) {
    const results = [];

    for (const id of ids) {
      try {
        const result = await this.userService.approveUser(id);
        results.push({ id, status: 'success', data: result });
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
      }
    }

    return { results };
  }

  @Post('batch-reject')
  @ApiOperation({ summary: '批量拒绝用户' })
  @ApiResponse({ status: 200, description: '用户已批量拒绝' })
  async batchRejectUsers(@Body('ids') ids: string[]) {
    const results = [];

    for (const id of ids) {
      try {
        const result = await this.userService.rejectUser(id);
        results.push({ id, status: 'success', data: result });
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
      }
    }

    return { results };
  }

  @Get('pending-count')
  @ApiOperation({ summary: '获取待审核用户数量' })
  @ApiResponse({ status: 200, description: '返回待审核用户数量' })
  async getPendingApprovalCount() {
    const count = await this.userService.prisma.user.count({
      where: {
        isApproved: false,
      },
    });

    return { count };
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除用户' })
  @ApiResponse({ status: 200, description: '用户已批量删除' })
  async batchDeleteUsers(@Body('ids') ids: string[]) {
    const results = [];

    for (const id of ids) {
      try {
        const result = await this.userService.remove(id);
        results.push({ id, status: 'success', data: result });
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
      }
    }

    return { results };
  }

  @Post('batch-reset-password')
  @ApiOperation({ summary: '批量重置用户密码' })
  @ApiResponse({ status: 200, description: '用户密码已批量重置' })
  async batchResetPasswords(@Body('ids') ids: string[]) {
    const results = [];
    const defaultPassword = '123456';

    for (const id of ids) {
      try {
        const result = await this.userService.resetUserPassword(id, defaultPassword);
        results.push({ id, status: 'success', data: result });
      } catch (error) {
        results.push({ id, status: 'error', message: error.message });
      }
    }

    return { results };
  }
}
