import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (configService.get<string>('JWT_SECRET') || '').replace(/^"|"$/g, ''),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: payload.sub },
          { user_id: payload.sub }
        ]
      }
    });

    if (!user) {
      throw new UnauthorizedException('User session invalid or expired.');
    }

    return { 
      userId: user.id, 
      sub: payload.sub,
      email: user.email, 
      role: user.userRole,
      roleLevel: user.roleLevel,
      tenantId: user.tenantId || null,
      organizationId: user.tenantId || null,
      isPreAuth: payload.type === 'pre-auth'
    };
  }
}
