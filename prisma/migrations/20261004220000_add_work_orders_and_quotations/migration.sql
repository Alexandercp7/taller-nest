-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('RECIBIDA', 'EN_DIAGNOSTICO', 'EN_ESPERA_COTIZACION', 'EN_ESPERA_APROBACION', 'EN_REPARACION', 'CONTROL_CALIDAD', 'LISTA_PARA_ENTREGA', 'ENTREGADA', 'CERRADA', 'EN_GARANTIA', 'CANCELADA');
CREATE TYPE "CommercialStatus" AS ENUM ('SIN_COTIZAR', 'COTIZADA', 'APROBADA_PARCIAL', 'APROBADA_TOTAL', 'EN_EJECUCION', 'CIERRE_PENDIENTE', 'COBRADA_PARCIAL', 'COBRADA_TOTAL');
CREATE TYPE "BillingStatus" AS ENUM ('NO_REQUERIDA', 'PENDIENTE_DATOS', 'LISTA_PARA_FACTURAR', 'FACTURADA', 'CANCELADA');
CREATE TYPE "QuotationApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "QuotationLineType" AS ENUM ('SERVICE', 'PART');
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "PhotoCategory" AS ENUM ('RECEPTION', 'INSPECTION', 'PROCESS', 'QUALITY_CONTROL', 'DELIVERY');

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceAdvisorId" TEXT NOT NULL,
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'RECIBIDA',
    "commercialStatus" "CommercialStatus" NOT NULL DEFAULT 'SIN_COTIZAR',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'NO_REQUERIDA',
    "estaRetrasada" BOOLEAN NOT NULL DEFAULT false,
    "portalToken" TEXT NOT NULL,
    "mileageIn" INTEGER,
    "fuelLevel" INTEGER,
    "failureDescription" TEXT NOT NULL,
    "diagnosis" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtReceptionChecklist" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "hasKeys" BOOLEAN NOT NULL DEFAULT true,
    "hasSpareTire" BOOLEAN NOT NULL DEFAULT false,
    "hasJack" BOOLEAN NOT NULL DEFAULT false,
    "hasTools" BOOLEAN NOT NULL DEFAULT false,
    "hasExtinguisher" BOOLEAN NOT NULL DEFAULT false,
    "exteriorDamage" JSONB,
    "personalItems" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtReceptionChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtNote" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtPhoto" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL DEFAULT 'RECEPTION',
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2),
    "aplicaIva" BOOLEAN NOT NULL DEFAULT true,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "clientApprovalStatus" "QuotationApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "lineType" "QuotationLineType" NOT NULL,
    "serviceId" TEXT,
    "articleId" TEXT,
    "concept" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "priceOverrideReason" TEXT,
    "priceOverrideById" TEXT,
    "approvalStatus" "QuotationApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reQuotedFromLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_portalToken_key" ON "WorkOrder"("portalToken");
CREATE UNIQUE INDEX "WorkOrder_workshopId_code_key" ON "WorkOrder"("workshopId", "code");
CREATE INDEX "WorkOrder_workshopId_idx" ON "WorkOrder"("workshopId");
CREATE INDEX "WorkOrder_workshopId_operationalStatus_idx" ON "WorkOrder"("workshopId", "operationalStatus");
CREATE INDEX "WorkOrder_serviceAdvisorId_idx" ON "WorkOrder"("serviceAdvisorId");
CREATE INDEX "WorkOrder_clientId_idx" ON "WorkOrder"("clientId");
CREATE INDEX "WorkOrder_vehicleId_idx" ON "WorkOrder"("vehicleId");
CREATE INDEX "WorkOrder_createdAt_id_idx" ON "WorkOrder"("createdAt", "id");

CREATE UNIQUE INDEX "OtReceptionChecklist_workOrderId_key" ON "OtReceptionChecklist"("workOrderId");
CREATE INDEX "OtNote_workOrderId_idx" ON "OtNote"("workOrderId");
CREATE INDEX "OtNote_workOrderId_isClientVisible_idx" ON "OtNote"("workOrderId", "isClientVisible");
CREATE INDEX "OtPhoto_workOrderId_idx" ON "OtPhoto"("workOrderId");

CREATE UNIQUE INDEX "Quotation_workOrderId_key" ON "Quotation"("workOrderId");
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");
CREATE INDEX "QuotationLine_approvalStatus_idx" ON "QuotationLine"("approvalStatus");
CREATE INDEX "StockMovement_workOrderId_idx" ON "StockMovement"("workOrderId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_serviceAdvisorId_fkey" FOREIGN KEY ("serviceAdvisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtReceptionChecklist" ADD CONSTRAINT "OtReceptionChecklist_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtNote" ADD CONSTRAINT "OtNote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtNote" ADD CONSTRAINT "OtNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OtPhoto" ADD CONSTRAINT "OtPhoto_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OtPhoto" ADD CONSTRAINT "OtPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_priceOverrideById_fkey" FOREIGN KEY ("priceOverrideById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_reQuotedFromLineId_fkey" FOREIGN KEY ("reQuotedFromLineId") REFERENCES "QuotationLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
