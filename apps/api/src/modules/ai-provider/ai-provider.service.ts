import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAIProviderDto } from './dto/update-ai-provider.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AIProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService
  ) {}

  async create(createDto: CreateAIProviderDto, userId: string, userRole: string) {
    // 只有管理员可以创建全局Provider
    if (createDto.isGlobal && userRole !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建全局AI Provider');
    }

    return this.prisma.aIProvider.create({
      data: {
        ...createDto,
        createdBy: userId,
        isGlobal: userRole === 'ADMIN' ? createDto.isGlobal || false : false,
      },
    });
  }

  async findAll(userId: string, userRole: string) {
    const where: any = {
      isActive: true,
    };

    if (userRole === 'ADMIN') {
      // 管理员可以看到所有Provider
    } else {
      // 教师只能看到全局Provider和自己创建的Provider
      where.OR = [{ isGlobal: true }, { createdBy: userId }];
    }

    return this.prisma.aIProvider.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('AI Provider不存在');
    }

    // 权限检查
    if (userRole !== 'ADMIN' && !provider.isGlobal && provider.createdBy !== userId) {
      throw new ForbiddenException('无权访问此AI Provider');
    }

    return provider;
  }

  async update(id: string, updateDto: UpdateAIProviderDto, userId: string, userRole: string) {
    const provider = await this.findOne(id, userId, userRole);

    // 权限检查
    if (userRole !== 'ADMIN' && provider.createdBy !== userId) {
      throw new ForbiddenException('无权修改此AI Provider');
    }

    // 只有管理员可以修改isGlobal属性
    if (updateDto.isGlobal !== undefined && userRole !== 'ADMIN') {
      delete updateDto.isGlobal;
    }

    return this.prisma.aIProvider.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const provider = await this.findOne(id, userId, userRole);

    // 权限检查
    if (userRole !== 'ADMIN' && provider.createdBy !== userId) {
      throw new ForbiddenException('无权删除此AI Provider');
    }

    await this.prisma.aIProvider.delete({
      where: { id },
    });

    return { message: 'AI Provider删除成功' };
  }

  async setDefault(id: string, userId: string, userRole: string) {
    // 权限检查：仅 ADMIN 可设置系统默认
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以设置系统默认AI Provider');
    }

    // 验证 provider 存在且活跃
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI Provider不存在');
    }

    if (!provider.isActive) {
      throw new ForbiddenException('无法将已禁用的Provider设为默认');
    }

    // 更新系统设置中的 AI_PROVIDER
    await this.settingsService.updateSetting('AI_PROVIDER', id);

    return { message: `已将 "${provider.name}" 设为系统默认AI Provider` };
  }

  async getGlobalProvider() {
    return this.prisma.aIProvider.findFirst({
      where: {
        isGlobal: true,
        isActive: true,
      },
    });
  }
}
