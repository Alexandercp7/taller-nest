import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashReferenceType,
  CommercialStatus,
  Payment,
  PaymentType,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClientsService } from '../clients/clients.service';
import { RequestUser } from '@common/types/request-user.type';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceValidator } from './domain/balance-validator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentSummaryDto } from './dto/payment-summary.dto';
import { PaymentDto } from './dto/payment.dto';

type PaymentWithReceivedBy = Prisma.PaymentGetPayload<{
  include: {
    receivedBy: { select: { firstName: true; lastName: true } };
  };
}>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly finance: FinanceService,
    private readonly clients: ClientsService,
  ) {}

  async create(
    workOrderId: string,
    dto: CreatePaymentDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentDto> {
    const execute = async (db: Prisma.TransactionClient) => {
      const wo = await db.workOrder.findFirst({
        where: { id: workOrderId, workshopId: actor.workshopId },
        include: {
          accountReceivable: true,
          commercialClose: true,
        },
      });

      if (!wo) {
        throw new NotFoundException(
          `Orden de trabajo con id '${workOrderId}' no encontrada.`,
        );
      }

      const balance = wo.accountReceivable ? wo.accountReceivable.balance : null;

      const validated = BalanceValidator.validate(
        dto.amount,
        balance,
        dto.paymentMethod,
        dto.terminalCommission,
      );

      // Registrar movimiento de caja (INCOME)
      const cashMovement = await this.finance.createCashMovement(
        {
          type: 'INCOME',
          amount: validated.amount.toFixed(2),
          concept: `Pago (${dto.type}) de orden de trabajo ${wo.code}`,
          referenceType: CashReferenceType.WORK_ORDER,
          referenceId: wo.id,
        },
        actor,
        db,
      );

      // Si existe CxC (la orden ya tiene cierre comercial), aplicar pago al saldo
      let newBalance = balance;
      if (wo.accountReceivable) {
        const applyResult = await this.finance.applyPaymentToReceivable(
          wo.accountReceivable.id,
          validated.amount,
          db,
        );
        newBalance = applyResult.newBalance;

        // Actualizar estado comercial de la OT
        const nextCommercialStatus = applyResult.isFullyPaid
          ? CommercialStatus.COBRADA_TOTAL
          : CommercialStatus.COBRADA_PARCIAL;

        await db.workOrder.update({
          where: { id: wo.id },
          data: { commercialStatus: nextCommercialStatus },
        });
      }

      // Crear registro Payment
      const payment = await db.payment.create({
        data: {
          workshopId: actor.workshopId,
          workOrderId: wo.id,
          accountReceivableId: wo.accountReceivable?.id,
          type: dto.type,
          paymentMethod: dto.paymentMethod,
          amount: validated.amount,
          terminalCommission: validated.terminalCommission,
          netAmount: validated.netAmount,
          reference: dto.reference,
          notes: dto.notes,
          receivedById: actor.id,
          cashMovementId: cashMovement.id,
        },
        include: {
          receivedBy: { select: { firstName: true, lastName: true } },
        },
      });

      // Recalcular segmentación y deuda del cliente
      await this.clients.recalculateTag(wo.clientId, actor.id, db);

      await this.audit.log(
        {
          workshopId: actor.workshopId,
          entityType: 'Payment',
          entityId: payment.id,
          action: 'PAYMENT_REGISTERED',
          actorId: actor.id,
          after: {
            workOrderId: wo.id,
            amount: payment.amount.toFixed(2),
            method: payment.paymentMethod,
            type: payment.type,
            newBalance: newBalance ? newBalance.toFixed(2) : null,
          },
        },
        db,
      );

      return this.toPaymentDto(payment);
    };

    if (tx) {
      return execute(tx);
    }
    return this.prisma.$transaction(execute);
  }

  async findByWorkOrder(
    workOrderId: string,
    actor: RequestUser,
  ): Promise<PaymentDto[]> {
    const items = await this.prisma.payment.findMany({
      where: { workOrderId, workshopId: actor.workshopId },
      orderBy: { createdAt: 'desc' },
      include: {
        receivedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return items.map((i) => this.toPaymentDto(i));
  }

  async getSummary(
    workOrderId: string,
    actor: RequestUser,
  ): Promise<PaymentSummaryDto> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, workshopId: actor.workshopId },
      include: {
        quotation: true,
        commercialClose: true,
        accountReceivable: true,
        payments: {
          orderBy: { createdAt: 'asc' },
          include: {
            receivedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!wo) {
      throw new NotFoundException(
        `Orden de trabajo '${workOrderId}' no encontrada.`,
      );
    }

    const totalPaid = wo.payments.reduce(
      (sum, p) => sum.plus(p.amount),
      new Prisma.Decimal('0.00'),
    );

    const quotationTotal = wo.quotation
      ? wo.quotation.total.toFixed(2)
      : '0.00';
    const frozenTotal = wo.commercialClose
      ? wo.commercialClose.frozenTotal.toFixed(2)
      : null;

    const balance = wo.accountReceivable
      ? wo.accountReceivable.balance.toFixed(2)
      : wo.commercialClose
        ? Prisma.Decimal.max(
            new Prisma.Decimal('0.00'),
            wo.commercialClose.frozenTotal.minus(totalPaid),
          ).toFixed(2)
        : Prisma.Decimal.max(
            new Prisma.Decimal('0.00'),
            (wo.quotation?.total ?? new Prisma.Decimal('0.00')).minus(totalPaid),
          ).toFixed(2);

    return {
      workOrderId: wo.id,
      workOrderCode: wo.code,
      commercialStatus: wo.commercialStatus,
      quotationTotal,
      frozenTotal,
      totalPaid: totalPaid.toFixed(2),
      balance,
      receivableStatus: wo.accountReceivable?.status ?? null,
      payments: wo.payments.map((p) => this.toPaymentDto(p)),
    };
  }

  toPaymentDto(item: PaymentWithReceivedBy): PaymentDto {
    const receivedByName = item.receivedBy
      ? `${item.receivedBy.firstName} ${item.receivedBy.lastName}`.trim()
      : undefined;

    return {
      id: item.id,
      workshopId: item.workshopId,
      workOrderId: item.workOrderId,
      accountReceivableId: item.accountReceivableId,
      type: item.type,
      paymentMethod: item.paymentMethod,
      amount: item.amount.toFixed(2),
      terminalCommission: item.terminalCommission.toFixed(2),
      netAmount: item.netAmount.toFixed(2),
      reference: item.reference,
      notes: item.notes,
      receivedById: item.receivedById,
      receivedByName,
      cashMovementId: item.cashMovementId,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
