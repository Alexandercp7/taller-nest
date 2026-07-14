-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('FISICA', 'MORAL');

-- CreateEnum
CREATE TYPE "ClientSegment" AS ENUM ('NUEVO', 'FRECUENTE', 'ANTIGUO');

-- CreateEnum
CREATE TYPE "PriceListItemType" AS ENUM ('SERVICE', 'PART');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('HERRAMIENTA', 'CONSUMIBLE', 'EQUIPO', 'PARTE_EN_VENTA');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "personType" "PersonType" NOT NULL,
    "name" TEXT NOT NULL,
    "rfc" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "hasDebt" BOOLEAN NOT NULL DEFAULT false,
    "segment" "ClientSegment" NOT NULL DEFAULT 'NUEVO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "km" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "type" "PriceListItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "sku" TEXT,
    "type" "ArticleType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyItem" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "description" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_workshopId_idx" ON "Client"("workshopId");

-- CreateIndex
CREATE INDEX "Client_workshopId_segment_idx" ON "Client"("workshopId", "segment");

-- CreateIndex
CREATE INDEX "Client_workshopId_hasDebt_idx" ON "Client"("workshopId", "hasDebt");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_workshopId_rfc_key" ON "Client"("workshopId", "rfc");

-- CreateIndex
CREATE INDEX "Vehicle_workshopId_idx" ON "Vehicle"("workshopId");

-- CreateIndex
CREATE INDEX "Vehicle_workshopId_plate_idx" ON "Vehicle"("workshopId", "plate");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_workshopId_vin_key" ON "Vehicle"("workshopId", "vin");

-- CreateIndex
CREATE INDEX "PriceListItem_workshopId_idx" ON "PriceListItem"("workshopId");

-- CreateIndex
CREATE INDEX "PriceListItem_workshopId_type_idx" ON "PriceListItem"("workshopId", "type");

-- CreateIndex
CREATE INDEX "PriceListItem_name_idx" ON "PriceListItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_workshopId_sku_key" ON "PriceListItem"("workshopId", "sku");

-- CreateIndex
CREATE INDEX "Supplier_workshopId_idx" ON "Supplier"("workshopId");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Article_workshopId_idx" ON "Article"("workshopId");

-- CreateIndex
CREATE INDEX "Article_workshopId_type_idx" ON "Article"("workshopId", "type");

-- CreateIndex
CREATE INDEX "Article_name_idx" ON "Article"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Article_workshopId_sku_key" ON "Article"("workshopId", "sku");

-- CreateIndex
CREATE INDEX "StockMovement_articleId_createdAt_idx" ON "StockMovement"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_workshopId_idx" ON "StockMovement"("workshopId");

-- CreateIndex
CREATE INDEX "CustodyItem_workshopId_idx" ON "CustodyItem"("workshopId");

-- CreateIndex
CREATE INDEX "CustodyItem_clientId_idx" ON "CustodyItem"("clientId");

-- CreateIndex
CREATE INDEX "CustodyItem_workshopId_isReturned_idx" ON "CustodyItem"("workshopId", "isReturned");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
