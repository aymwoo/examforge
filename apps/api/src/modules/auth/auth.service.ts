import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, RegisterDto } from './dto/login.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async login(loginDto: LoginDto) {
    // 首先尝试查找用户表
    let user = await this.userService.findByUsername(loginDto.username);
    let isStudent = false;

    // 如果用户表中没找到，尝试查找学生表（使用学号作为用户名）
    if (!user) {
      const student = await this.prisma.student.findUnique({
        where: { studentId: loginDto.username },
      });

      if (student) {
        // 将学生信息转换为用户格式
        user = {
          id: student.id,
          username: student.studentId,
          name: student.name,
          password: student.password,
          role: 'STUDENT',
          email: null,
          isActive: true,
          isApproved: true, // 学生默认视为已审核
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        } as any;
        isStudent = true;
      }
    }

    if (!user || !user.isActive || !user.isApproved) {
      if (user && !user.isApproved) {
        throw new UnauthorizedException('账户尚未通过审核，请联系管理员进行审核。');
      } else {
        throw new UnauthorizedException('用户名或密码错误，或账户尚未通过审核');
      }
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      isStudent,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if username already exists
    const existingUser = await this.userService.findByUsername(registerDto.username);
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // Check if this is the first user (should be admin and auto-approved)
    const userCount = await this.userService.count();
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 'ADMIN' : 'TEACHER';

    const user = await this.userService.create({
      username: registerDto.username,
      password: registerDto.password,
      name: registerDto.name,
      role,
      email: registerDto.email || null,
      isActive: isFirstUser, // 第一个用户直接激活
      isApproved: isFirstUser, // 第一个用户自动通过审核
    });

    // 对于第一个用户（系统管理员），直接返回token
    if (isFirstUser) {
      const payload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        isStudent: false,
      };

      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        message: '系统管理员注册成功，已自动登录',
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
          isActive: user.isActive,
          isApproved: user.isApproved,
        },
      };
    } else {
      // 不返回token，因为普通用户需要等待审核
      return {
        message: '注册成功！您的账户正在等待管理员审核，审核通过后即可登录使用系统。',
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
          isActive: user.isActive,
          isApproved: user.isApproved,
        },
      };
    }
  }

  async checkFirstUser(): Promise<{ isFirstUser: boolean }> {
    const userCount = await this.userService.count();
    return { isFirstUser: userCount === 0 };
  }

  async validateUser(payload: any) {
    // 如果是学生用户，查找学生表
    if (payload.isStudent) {
      const student = await this.prisma.student.findUnique({
        where: { id: payload.sub },
      });
      if (!student) {
        throw new UnauthorizedException('学生不存在');
      }
      return {
        id: student.id,
        username: student.studentId,
        name: student.name,
        role: 'STUDENT',
        isActive: true,
        isApproved: true, // 学生默认视为已审核
        isStudent: true,
      };
    }

    // 普通用户查找用户表
    const user = await this.userService.findOne(payload.sub);
    if (!user || !user.isActive || !user.isApproved) {
      if (user && !user.isApproved) {
        throw new UnauthorizedException('账户尚未通过审核，请联系管理员进行审核。');
      } else {
        throw new UnauthorizedException('用户不存在、已被禁用或尚未通过审核');
      }
    }
    return user;
  }
}
