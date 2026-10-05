import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovement,
  CashMovementType,
  CashReferenceType,
  Prisma,
  ReceivableStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  FinancialAggregatesInput,
  FinancialReportCalculator,
} from './domain/financial-report-calculator';
import { AccountReceivableDto } from './dto/account-receivable.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { FinancialReportDto } from './dto/financial-report.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';

type AccountReceivableWithRelations = Prisma.AccountReceivableGetPayload<{
  include: {
    workOrder: { select: { code: true } };
    client: { select: { name: true } };
  };
}>;

type CashMovementWithUser = Prisma.CashMovementGetPayload<{
  include: {
    performedBy: { select: { firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upsertReceivableFromClose(
    workOrder: { id: string; workshopId: string; clientId: string },
    frozenTotal: Prisma.Decimal,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    // Obtener abonos/anticipos previos ya registrados en esta orden
    const existingPayments = await db.payment.findMany({
      where: {
        workOrderId: workOrder.id,
        workshopId: workOrder.workshopId,
      },
    });

    const paidAmount = existingPayments.reduce(
      (sum, p) => sum.plus(p.amount),
      new Prisma.Decimal('0.00'),
    );

    const balance = Prisma.Decimal.max(
      new Prisma.Decimal('0.00'),
      frozenTotal.minus(paidAmount),
    );

    const status: ReceivableStatus = balance.isZero()
      ? ReceivableStatus.PAID
      : paidAmount.gt(0)
        ? ReceivableStatus.PARTIAL
        : ReceivableStatus.OPEN;

    const receivable = await db.accountReceivable.upsert({
      where: { workOrderId: workOrder.id },
      create: {
        workshopId: workOrder.workshopId,
        workOrderId: workOrder.id,
        clientId: workOrder.clientId,
        originalAmount: frozenTotal,
        paidAmount,
        balance,
        status,
      },
      update: {
        originalAmount: frozenTotal,
        balance,
        status,
      },
    });

    // Vincular pagos huérfanos anteriores (anticipos) a esta nueva CxC
    if (existingPayments.length > 0) {
      await db.payment.updateMany({
        where: {
          workOrderId: workOrder.id,
          accountReceivableId: null,
        },
        data: {
          accountReceivableId: receivable.id,
        },
      });
    }

    return receivable;
  }

  async getReceivableOrThrow(
    workOrderId: string,
    workshopId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const ar = await db.accountReceivable.findFirst({
      where: { workOrderId, workshopId },
    });
    if (!ar) {
      throw new NotFoundException(
        `No existe cuenta por cobrar para la orden de trabajo '${workOrderId}'. Debe cerrarse comercialmente primero.`,
      );
    }
    return ar;
  }

  async applyPaymentToReceivable(
    receivableId: string,
    amount: Prisma.Decimal,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const ar = await db.accountReceivable.findUniqueOrThrow({
      where: { id: receivableId },
    });

    if (amount.gt(ar.balance)) {
      throw new BadRequestException(
        `El pago ($${amount.toFixed(2)}) no puede exceder el saldo deudor ($${ar.balance.toFixed(2)}).`,
      );
    }

    const newPaidAmount = ar.paidAmount.plus(amount);
    const newBalance = Prisma.Decimal.max(
      new Prisma.Decimal('0.00'),
      ar.balance.minus(amount),
    );
    const newStatus: ReceivableStatus = newBalance.isZero()
      ? ReceivableStatus.PAID
      : ReceivableStatus.PARTIAL;

    const updated = await db.accountReceivable.update({
      where: { id: receivableId },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
      },
    });

    return {
      receivable: updated,
      newBalance,
      isFullyPaid: newBalance.isZero(),
    };
  }

  async createCashMovement(
    dto: CreateCashMovementDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<CashMovementDto> {
    const db = tx ?? this.prisma;

    const movement = await db.cashMovement.create({
      data: {
        workshopId: actor.workshopId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        concept: dto.concept,
        referenceType: dto.referenceType ?? CashReferenceType.MANUAL,
        referenceId: dto.referenceId,
        performedById: actor.id,
      },
      include: {
        performedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'CashMovement',
        entityId: movement.id,
        action: 'CASH_MOVEMENT_CREATED',
        actorId: actor.id,
        after: {
          type: movement.type,
          amount: movement.amount.toString(),
          concept: movement.concept,
        },
      },
      tx,
    );

    return this.toCashMovementDto(movement);
  }

  async findAllReceivables(
    query: ListReceivablesQueryDto,
    actor: RequestUser,
  ): Promise<{ data: AccountReceivableDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AccountReceivableWhereInput = {
      workshopId: actor.workshopId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: { select: { code: true } },
          client: { select: { name: true } },
        },
      }),
      this.prisma.accountReceivable.count({ where }),
    ]);

    return {
      data: items.map((i) => this.toReceivableDto(i)),
      total,
    };
  }

  async findAllCashMovements(
    actor: RequestUser,
    limit: number = 50,
  ): Promise<CashMovementDto[]> {
    const items = await this.prisma.cashMovement.findMany({
      where: { workshopId: actor.workshopId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return items.map((i) => this.toCashMovementDto(i));
  }

  async getFinancialReport(
    query: FinancialReportQueryDto,
    actor: RequestUser,
  ): Promise<FinancialReportDto> {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (query.from) {
      fromDate = query.from.includes('T')
        ? new Date(query.from)
        : new Date(`${query.from}T00:00:00.000Z`);
    }

    if (query.to) {
      toDate = query.to.includes('T')
        ? new Date(query.to)
        : new Date(`${query.to}T23:59:59.999Z`);
    }

    const dateFilter: Prisma.DateTimeFilter | undefined =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          }
        : undefined;

    const [paymentsAgg, directIncomeAgg, directExpenseAgg, openReceivablesAgg] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            workshopId: actor.workshopId,
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: {
            amount: true,
            terminalCommission: true,
          },
        }),
        this.prisma.cashMovement.aggregate({
          where: {
            workshopId: actor.workshopId,
            type: CashMovementType.INCOME,
            referenceType: CashReferenceType.MANUAL,
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.cashMovement.aggregate({
          where: {
            workshopId: actor.workshopId,
            type: CashMovementType.EXPENSE,
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.accountReceivable.aggregate({
          where: {
            workshopId: actor.workshopId,
            status: { not: ReceivableStatus.PAID },
          },
          _sum: {
            balance: true,
          },
          _count: true,
        }),
      ]);

    const aggregates: FinancialAggregatesInput = {
      grossPaymentsTotal:
        paymentsAgg._sum.amount ?? new Prisma.Decimal('0.00'),
      terminalCommissionsTotal:
        paymentsAgg._sum.terminalCommission ?? new Prisma.Decimal('0.00'),
      directCashIncomeTotal:
        directIncomeAgg._sum.amount ?? new Prisma.Decimal('0.00'),
      directCashExpenseTotal:
        directExpenseAgg._sum.amount ?? new Prisma.Decimal('0.00'),
      totalReceivablesBalance:
        openReceivablesAgg._sum.balance ?? new Prisma.Decimal('0.00'),
      openReceivablesCount: openReceivablesAgg._count ?? 0,
    };

    return FinancialReportCalculator.calculate(aggregates);
  }

  toReceivableDto(item: AccountReceivableWithRelations): AccountReceivableDto {
    return {
      id: item.id,
      workshopId: item.workshopId,
      workOrderId: item.workOrderId,
      workOrderCode: item.workOrder?.code,
      clientId: item.clientId,
      clientName: item.client?.name,
      originalAmount: item.originalAmount.toFixed(2),
      paidAmount: item.paidAmount.toFixed(2),
      balance: item.balance.toFixed(2),
      status: item.status,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  toCashMovementDto(item: CashMovementWithUser): CashMovementDto {
    const performedByName = item.performedBy
      ? `${item.performedBy.firstName} ${item.performedBy.lastName}`.trim()
      : undefined;

    return {
      id: item.id,
      workshopId: item.workshopId,
      type: item.type,
      amount: item.amount.toFixed(2),
      referenceType: item.referenceType,
      referenceId: item.referenceId,
      concept: item.concept,
      performedById: item.performedById,
      performedByName,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
