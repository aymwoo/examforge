import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ExamAuthService } from '../exam-auth.service';

@Injectable()
export class ExamStudentGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly examAuthService: ExamAuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'exam-student') {
        throw new UnauthorizedException('Invalid token type');
      }

      const student = await this.examAuthService.validateExamStudent(payload.sub, payload.examId);

      request.examStudent = student;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
