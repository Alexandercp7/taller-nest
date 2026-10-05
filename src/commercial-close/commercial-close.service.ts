import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { RequestUser } from '@common/types/request-user.type';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialCloseResolver } from './domain/commercial-close-resolver';
import { CommercialCloseDto } from './dto/commercial-close.dto';
import { ExecuteCommercialCloseDto } from './dto/execute-commercial-close.dto';

type CommercialCloseWithUser = Prisma.CommercialCloseGetPayload<{
  include: {
    closedBy: { select: { firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class CommercialCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: FinanceService,
    private readonly clients: ClientsService,
  ) {}

  async executeClose(
    workOrderId: string,
    dto: ExecuteCommercialCloseDto,
    actor: RequestUser,
  ): Promise<CommercialCloseDto> {
    return this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findFirst({
        where: { id: workOrderId, workshopId: actor.workshopId },
        include: {
          client: true,
          quotation: {
            include: {
              lines: true,
            },
          },
          commercialClose: true,
        },
      });

      if (!wo) {
        throw new NotFoundException(
          `Orden de trabajo con id '${workOrderId}' no encontrada.`,
        );
      }

      // 1. Resolver total congelado, líneas aprobadas y estado fiscal
      const resolution = CommercialCloseResolver.resolve(
        wo,
        dto.requiresInvoice,
      );

      // 2. Guardar o actualizar registro de CommercialClose
      const closeRecord = await tx.commercialClose.upsert({
        where: { workOrderId: wo.id },
        create: {
          workOrderId: wo.id,
          workshopId: actor.workshopId,
          frozenTotal: resolution.frozenTotal,
          closedById: actor.id,
          billingStatusResolved: resolution.billingStatus,
          notes: dto.notes,
        },
        update: {
          frozenTotal: resolution.frozenTotal,
          closedById: actor.id,
          billingStatusResolved: resolution.billingStatus,
          notes: dto.notes,
          closedAt: new Date(),
        },
        include: {
          closedBy: { select: { firstName: true, lastName: true } },
        },
      });

      // 3. Crear/actualizar cuenta por cobrar deduciendo anticipos previos
      const receivable = await this.finance.upsertReceivableFromClose(
        wo,
        resolution.frozenTotal,
        tx,
      );

      // 4. Resolver estado comercial en función del saldo pendiente
      const nextCommercialStatus =
        CommercialCloseResolver.resolveCommercialStatus(
          receivable.balance,
          resolution.frozenTotal,
        );

      // 5. Actualizar la orden de trabajo
      await tx.workOrder.update({
        where: { id: wo.id },
        data: {
          closedAt: new Date(),
          commercialStatus: nextCommercialStatus,
          billingStatus: resolution.billingStatus,
        },
      });

      // 6. Recalcular segmentación y deuda del cliente
      await this.clients.recalculateTag(wo.clientId, actor.id, tx);

      // 7. Auditoría
      await this.audit.log(
        {
          workshopId: actor.workshopId,
          entityType: 'CommercialClose',
          entityId: closeRecord.id,
          action: 'COMMERCIAL_CLOSE_EXECUTED',
          actorId: actor.id,
          after: {
            workOrderId: wo.id,
            frozenTotal: resolution.frozenTotal.toFixed(2),
            billingStatus: resolution.billingStatus,
            commercialStatus: nextCommercialStatus,
            balance: receivable.balance.toFixed(2),
          },
        },
        tx,
      );

      return this.toDto(closeRecord, nextCommercialStatus, receivable.balance);
    });
  }

  async findByWorkOrder(
    workOrderId: string,
    actor: RequestUser,
  ): Promise<CommercialCloseDto | null> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, workshopId: actor.workshopId },
      include: {
        commercialClose: {
          include: {
            closedBy: { select: { firstName: true, lastName: true } },
          },
        },
        accountReceivable: true,
      },
    });

    if (!wo || !wo.commercialClose) {
      return null;
    }

    return this.toDto(
      wo.commercialClose,
      wo.commercialStatus,
      wo.accountReceivable?.balance ?? wo.commercialClose.frozenTotal,
    );
  }

  toDto(
    close: CommercialCloseWithUser,
    commercialStatus: any,
    balance: Prisma.Decimal,
  ): CommercialCloseDto {
    const closedByName = close.closedBy
      ? `${close.closedBy.firstName} ${close.closedBy.lastName}`.trim()
      : undefined;

    return {
      id: close.id,
      workOrderId: close.workOrderId,
      workshopId: close.workshopId,
      frozenTotal: close.frozenTotal.toFixed(2),
      closedById: close.closedById,
      closedByName,
      closedAt: close.closedAt.toISOString(),
      billingStatusResolved: close.billingStatusResolved,
      commercialStatus,
      balance: balance.toFixed(2),
      notes: close.notes,
      createdAt: close.createdAt.toISOString(),
    };
  }
}
