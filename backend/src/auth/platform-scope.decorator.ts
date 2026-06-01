import { SetMetadata } from '@nestjs/common';

export const PLATFORM_SCOPE_KEY = 'platform_scope';
export const PlatformScope = () => SetMetadata(PLATFORM_SCOPE_KEY, true);
