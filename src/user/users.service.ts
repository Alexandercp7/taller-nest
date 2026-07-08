import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import {
  ForbiddenActionException,
  LastAdminException,
} from '@common/exceptions/domain.exceptions';
import { RequestUser } from '../common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findMe(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          where: { granted: true },
          include: { permission: true },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    return {
      id: user.id,
      workshopId: user.workshopId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      kpiTitle: user.kpiTitle,
      isActive: user.isActive,
      effectivePermissions: user.userPermissions.map(
        (up) => up.permission.code,
      ),
    };
  }

  async create(
    dto: CreateUserDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<UserDto> {
    if (actor.role !== Role.ADMIN)
      throw new ForbiddenActionException('Solo ADMIN puede crear usuarios.');

    const db = tx ?? this.prisma;

    const existing = await db.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está en uso.');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await db.user.create({
      data: {
        workshopId: actor.workshopId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        kpiTitle: dto.kpiTitle,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'User',
        entityId: user.id,
        action: 'USER_CREATED',
        actorId: actor.id,
        after: { email: user.email, role: user.role },
      },
      tx,
    );

    return this.toUserDto(user);
  }

  async findAll(
    query: ListUsersQueryDto,
    actor: RequestUser,
  ): Promise<{ data: UserDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.role ? { role: query.role } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: data.map((u) => this.toUserDto(u)), total };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<UserDto> {
    if (actor.role !== Role.ADMIN)
      throw new ForbiddenActionException(
        'Solo ADMIN puede actualizar usuarios.',
      );

    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.workshopId !== actor.workshopId)
      throw new NotFoundException();

    if (user.role === Role.ADMIN && dto.role && dto.role !== Role.ADMIN) {
      const activeAdminCount = await db.user.count({
        where: {
          workshopId: actor.workshopId,
          role: Role.ADMIN,
          isActive: true,
        },
      });
      if (activeAdminCount <= 1) throw new LastAdminException();
    }

    const updated = await db.user.update({ where: { id }, data: dto });

    const action =
      dto.role && dto.role !== user.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED';
    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'User',
        entityId: id,
        action,
        actorId: actor.id,
        before: {
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        after: {
          role: updated.role,
          firstName: updated.firstName,
          lastName: updated.lastName,
        },
      },
      tx,
    );

    return this.toUserDto(updated);
  }

  async updatePermissions(
    id: string,
    dto: UpdatePermissionsDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (actor.role !== Role.ADMIN)
      throw new ForbiddenActionException(
        'Solo ADMIN puede modificar permisos de usuarios.',
      );

    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.workshopId !== actor.workshopId)
      throw new NotFoundException();

    for (const entry of dto.permissions) {
      await db.userPermission.upsert({
        where: {
          userId_permissionId: { userId: id, permissionId: entry.permissionId },
        },
        update: { granted: entry.granted },
        create: {
          userId: id,
          permissionId: entry.permissionId,
          granted: entry.granted,
        },
      });
    }

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'User',
        entityId: id,
        action: 'USER_PERMISSIONS_CHANGED',
        actorId: actor.id,
        after: {
          permissions: dto.permissions.map((p) => ({
            permissionId: p.permissionId,
            granted: p.granted,
          })),
        },
      },
      tx,
    );
  }

  async deactivate(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (actor.role !== Role.ADMIN)
      throw new ForbiddenActionException(
        'Solo ADMIN puede desactivar usuarios.',
      );

    const db = tx ?? this.prisma;

    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.workshopId !== actor.workshopId)
      throw new NotFoundException();

    if (user.role === Role.ADMIN) {
      const activeAdminCount = await db.user.count({
        where: {
          workshopId: actor.workshopId,
          role: Role.ADMIN,
          isActive: true,
        },
      });
      if (activeAdminCount <= 1) throw new LastAdminException();
    }

    await db.user.update({ where: { id }, data: { isActive: false } });
    await db.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'User',
        entityId: id,
        action: 'USER_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  private toUserDto(user: {
    id: string;
    workshopId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    kpiTitle: string | null;
    isActive: boolean;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      workshopId: user.workshopId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      kpiTitle: user.kpiTitle ?? undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
