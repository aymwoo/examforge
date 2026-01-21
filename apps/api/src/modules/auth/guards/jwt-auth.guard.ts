import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Skip auth for progress endpoint
    if (request.url?.includes('/import/pdf/progress/')) {
      return true;
    }

    return super.canActivate(context);
  }
}
