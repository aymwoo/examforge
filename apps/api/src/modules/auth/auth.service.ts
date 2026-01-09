import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto, RegisterDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByUsername(loginDto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
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

    // Check if this is the first user (should be admin)
    const userCount = await this.userService.count();
    const role = userCount === 0 ? 'ADMIN' : 'TEACHER';

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userService.create({
      username: registerDto.username,
      password: hashedPassword,
      name: registerDto.name,
      role,
      email: null,
      isActive: true,
    });

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
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

  async validateUser(payload: any) {
    const user = await this.userService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return user;
  }
}
