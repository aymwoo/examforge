import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          if (request?.cookies?.access_token) {
            return String(request.cookies.access_token);
          }
          const cookieHeader = request?.headers?.cookie;
          if (!cookieHeader) return null;
          const cookies = cookieHeader.split(';').map((cookie: string) => cookie.trim());
          const match = cookies.find((cookie: string) => cookie.startsWith('access_token='));
          return match ? decodeURIComponent(match.split('=')[1]) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return this.authService.validateUser(payload);
  }
}
