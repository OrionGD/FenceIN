import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (configService.get<string>('JWT_SECRET') || '').replace(/^"|"$/g, ''),
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.userId || payload.sub, 
      sub: payload.sub,
      email: payload.email, 
      role: payload.role,
      roleLevel: payload.roleLevel,
      tenantId: payload.tenantId || null,
      organizationId: payload.tenantId || null,
      isPreAuth: payload.type === 'pre-auth'
    };
  }
}
