-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'FINAL_SETTLEMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'CHECK');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CashReferenceType" AS ENUM ('WORK_ORDER', 'EXPENSE', 'MANUAL');

-- CreateTable
CREATE TABLE "CommercialClose" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "frozenTotal" DECIMAL(12,2) NOT NULL,
    "closedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingStatusResolved" "BillingStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountReceivable" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "accountReceivableId" TEXT,
    "type" "PaymentType" NOT NULL DEFAULT 'FINAL_SETTLEMENT',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "terminalCommission" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "cashMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "referenceType" "CashReferenceType" NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT,
    "concept" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialClose_workOrderId_key" ON "CommercialClose"("workOrderId");

-- CreateIndex
CREATE INDEX "CommercialClose_workshopId_idx" ON "CommercialClose"("workshopId");

-- CreateIndex
CREATE INDEX "CommercialClose_closedById_idx" ON "CommercialClose"("closedById");

-- CreateIndex
CREATE UNIQUE INDEX "AccountReceivable_workOrderId_key" ON "AccountReceivable"("workOrderId");

-- CreateIndex
CREATE INDEX "AccountReceivable_workshopId_idx" ON "AccountReceivable"("workshopId");

-- CreateIndex
CREATE INDEX "AccountReceivable_clientId_idx" ON "AccountReceivable"("clientId");

-- CreateIndex
CREATE INDEX "AccountReceivable_status_idx" ON "AccountReceivable"("status");

-- CreateIndex
CREATE INDEX "AccountReceivable_workshopId_status_idx" ON "AccountReceivable"("workshopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_cashMovementId_key" ON "Payment"("cashMovementId");

-- CreateIndex
CREATE INDEX "Payment_workshopId_idx" ON "Payment"("workshopId");

-- CreateIndex
CREATE INDEX "Payment_workOrderId_idx" ON "Payment"("workOrderId");

-- CreateIndex
CREATE INDEX "Payment_accountReceivableId_idx" ON "Payment"("accountReceivableId");

-- CreateIndex
CREATE INDEX "Payment_receivedById_idx" ON "Payment"("receivedById");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_workshopId_idx" ON "CashMovement"("workshopId");

-- CreateIndex
CREATE INDEX "CashMovement_type_createdAt_idx" ON "CashMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CashMovement_referenceType_referenceId_idx" ON "CashMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "CashMovement_performedById_idx" ON "CashMovement"("performedById");

-- AddForeignKey
ALTER TABLE "CommercialClose" ADD CONSTRAINT "CommercialClose_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialClose" ADD CONSTRAINT "CommercialClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialClose" ADD CONSTRAINT "CommercialClose_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "AccountReceivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashMovementId_fkey" FOREIGN KEY ("cashMovementId") REFERENCES "CashMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
