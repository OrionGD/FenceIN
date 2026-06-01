import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MongoModule } from '../mongo/mongo.module';
import { JwtStrategy } from './jwt.strategy';
import { TenantGuard } from './tenant.guard';
import { BiometricsModule } from '../biometrics/biometrics.module';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    MongoModule,
    PassportModule,
    forwardRef(() => BiometricsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: (configService.get<string>('JWT_SECRET') || '').replace(/^\"|\"$/g, ''),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TenantGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
