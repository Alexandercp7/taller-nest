import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientSegment, PersonType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { InvalidClientIdentityException } from '@common/exceptions/domain.exceptions';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateClientSegment,
  ClientSegmentThresholds,
} from './domain/client-segment.calculator';
import { ClientDto } from './dto/client.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const RFC_LENGTH: Record<PersonType, number> = {
  [PersonType.MORAL]: 12,
  [PersonType.FISICA]: 13,
};

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async create(
    dto: CreateClientDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ClientDto> {
    this.assertValidIdentity(dto.personType, dto.rfc);

    const db = tx ?? this.prisma;

    if (dto.rfc) {
      const existing = await db.client.findFirst({
        where: { workshopId: actor.workshopId, rfc: dto.rfc },
      });
      if (existing) throw new ConflictException('El RFC ya está en uso.');
    }

    const client = await db.client.create({
      data: {
        workshopId: actor.workshopId,
        personType: dto.personType,
        name: dto.name,
        rfc: dto.rfc,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Client',
        entityId: client.id,
        action: 'CLIENT_CREATED',
        actorId: actor.id,
        after: { name: client.name, personType: client.personType },
      },
      tx,
    );

    return this.toClientDto(client);
  }

  async findAll(
    query: ListClientsQueryDto,
    actor: RequestUser,
  ): Promise<{ data: ClientDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.hasDebt !== undefined ? { hasDebt: query.hasDebt } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(
      ':',
    ) as ['name' | 'createdAt', 'asc' | 'desc'];

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortDir },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data: data.map((c) => this.toClientDto(c)), total };
  }

  async findOne(id: string, actor: RequestUser): Promise<ClientDto> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client || client.workshopId !== actor.workshopId)
      throw new NotFoundException();
    return this.toClientDto(client);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ClientDto> {
    const db = tx ?? this.prisma;
    const client = await db.client.findUnique({ where: { id } });
    if (!client || client.workshopId !== actor.workshopId)
      throw new NotFoundException();

    const nextPersonType = dto.personType ?? client.personType;
    const nextRfc = dto.rfc !== undefined ? dto.rfc : (client.rfc ?? undefined);
    if (dto.personType !== undefined || dto.rfc !== undefined) {
      this.assertValidIdentity(nextPersonType, nextRfc);
    }

    if (dto.rfc && dto.rfc !== client.rfc) {
      const existing = await db.client.findFirst({
        where: { workshopId: actor.workshopId, rfc: dto.rfc, NOT: { id } },
      });
      if (existing) throw new ConflictException('El RFC ya está en uso.');
    }

    const updated = await db.client.update({ where: { id }, data: dto });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Client',
        entityId: id,
        action: 'CLIENT_UPDATED',
        actorId: actor.id,
        before: { name: client.name, rfc: client.rfc, phone: client.phone },
        after: {
          name: updated.name,
          rfc: updated.rfc,
          phone: updated.phone,
        },
      },
      tx,
    );

    return this.toClientDto(updated);
  }

  async deactivate(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const client = await db.client.findUnique({ where: { id } });
    if (!client || client.workshopId !== actor.workshopId)
      throw new NotFoundException();

    await this.assertNoActiveOrders(id);

    await db.client.update({ where: { id }, data: { isActive: false } });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Client',
        entityId: id,
        action: 'CLIENT_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  /**
   * Nombre conservado porque es el único literalmente documentado
   * (code-conventions.md:59, diagrams.md:130), aunque ahora recalcula
   * dos campos independientes (hasDebt, segment) en vez de un tag único.
   */
  async recalculateTag(
    clientId: string,
    actorId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ClientDto> {
    const db = tx ?? this.prisma;
    const client = await db.client.findUniqueOrThrow({
      where: { id: clientId },
    });

    const thresholds = this.getSegmentThresholds();
    const { hasDebt, fullyPaidOrdersCount } =
      await this.fetchSegmentationInputs(clientId);
    const segment = calculateClientSegment(fullyPaidOrdersCount, thresholds);

    const updated = await db.client.update({
      where: { id: clientId },
      data: { hasDebt, segment },
    });

    await this.audit.log(
      {
        workshopId: client.workshopId,
        entityType: 'Client',
        entityId: clientId,
        action: 'CLIENT_SEGMENTATION_RECALCULATED',
        actorId,
        before: { hasDebt: client.hasDebt, segment: client.segment },
        after: { hasDebt, segment },
      },
      tx,
    );

    return this.toClientDto(updated);
  }

  async assertActiveClient(
    clientId: string,
    workshopId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.workshopId !== workshopId)
      throw new NotFoundException('Cliente no encontrado.');
    if (!client.isActive)
      throw new BadRequestException(
        'El cliente está inactivo; no se le puede asociar un vehículo.',
      );
  }

  private assertValidIdentity(personType: PersonType, rfc?: string): void {
    if (!rfc) return;
    const expectedLength = RFC_LENGTH[personType];
    if (rfc.length !== expectedLength) {
      throw new InvalidClientIdentityException(
        `El RFC debe tener ${expectedLength} caracteres para personType ${personType}.`,
      );
    }
  }

  private getSegmentThresholds(): ClientSegmentThresholds {
    const frecuente = Number(
      this.config.get('CLIENT_SEGMENT_FRECUENTE_THRESHOLD') ?? 3,
    );
    const antiguo = Number(
      this.config.get('CLIENT_SEGMENT_ANTIGUO_THRESHOLD') ?? 10,
    );
    if (!(antiguo > frecuente)) {
      throw new Error(
        'CLIENT_SEGMENT_ANTIGUO_THRESHOLD debe ser mayor que CLIENT_SEGMENT_FRECUENTE_THRESHOLD.',
      );
    }
    return { frecuente, antiguo };
  }

  // TODO(work-orders): reemplazar cuando exista el modelo WorkOrder.
  // const activeCount = await this.prisma.workOrder.count({
  //   where: { clientId, operationalStatus: { notIn: TERMINAL_STATUSES } },
  // });
  // if (activeCount > 0) throw new ClientHasActiveOrdersException();
  private async assertNoActiveOrders(clientId: string): Promise<void> {
    void clientId;
  }

  // TODO(work-orders, finance): reemplazar cuando existan WorkOrder y AccountReceivable.
  // hasDebt = (await this.prisma.accountReceivable.count({
  //   where: { workOrder: { clientId }, balance: { gt: 0 } },
  // })) > 0;
  // fullyPaidOrdersCount = await this.prisma.workOrder.count({
  //   where: { clientId, accountReceivable: { status: 'PAID' } },
  // });
  private async fetchSegmentationInputs(
    clientId: string,
  ): Promise<{ hasDebt: boolean; fullyPaidOrdersCount: number }> {
    void clientId;
    return { hasDebt: false, fullyPaidOrdersCount: 0 };
  }

  private toClientDto(client: {
    id: string;
    workshopId: string;
    personType: PersonType;
    name: string;
    rfc: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    hasDebt: boolean;
    segment: ClientSegment;
    isActive: boolean;
    createdAt: Date;
  }): ClientDto {
    return {
      id: client.id,
      workshopId: client.workshopId,
      personType: client.personType,
      name: client.name,
      rfc: client.rfc ?? undefined,
      phone: client.phone,
      email: client.email ?? undefined,
      address: client.address ?? undefined,
      hasDebt: client.hasDebt,
      segment: client.segment,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  }
}
