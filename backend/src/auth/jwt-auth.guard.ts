import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    if (user.isPreAuth) {
      const allowedPaths = [
        '/api/v1/biometrics/verify',
        '/api/v1/biometrics/verify-fingerprint',
        '/api/v1/biometrics/enroll',
        '/api/v1/biometrics/enroll-fingerprint'
      ];
      // Normalize url
      const cleanUrl = url.replace(/^\/api\/v1/, '').split('?')[0];
      const isAllowed = allowedPaths.some(path => {
        const cleanPath = path.replace(/^\/api\/v1/, '');
        return cleanPath === cleanUrl;
      });
      if (!isAllowed) {
        throw new UnauthorizedException('Biometric verification required to access this resource.');
      }
    }
    return user;
  }
}
