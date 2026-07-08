import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PERMISSION_KEY = 'requiresPermission';
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRES_PERMISSION_KEY, permission);
