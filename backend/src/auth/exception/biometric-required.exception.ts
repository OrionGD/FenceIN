import { ForbiddenException } from '@nestjs/common';

export class BiometricRequiredException extends ForbiddenException {
  constructor(message: string = 'Biometric enrollment required') {
    super(message);
  }
}
