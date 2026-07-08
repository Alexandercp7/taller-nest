import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CanActivate } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { RequestUser } from '../types/request-user.type';
import { REQUIRES_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<
      string | undefined
    >(REQUIRES_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredPermission) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const user = request.user;

    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.DIRECTOR && requiredPermission !== 'user:manage')
      return true;
    if (user.effectivePermissions.includes(requiredPermission)) return true;

    throw new ForbiddenException(
      'No tienes permiso para realizar esta acción.',
    );
  }
}
