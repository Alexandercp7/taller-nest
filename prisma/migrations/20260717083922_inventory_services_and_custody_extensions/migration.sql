/*
  Warnings:

  - You are about to drop the `PriceListItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('AUTO', 'CAMIONETA', 'CAMION');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('AFINACION_Y_OTROS', 'MECANICA_RAPIDA', 'MECANICA_GENERAL');

-- CreateEnum
CREATE TYPE "ArticleCondition" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'DANADO');

-- DropForeignKey
ALTER TABLE "PriceListItem" DROP CONSTRAINT "PriceListItem_workshopId_fkey";

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "condition" "ArticleCondition",
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "purchasePrice" DECIMAL(12,2),
ADD COLUMN     "salePrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "CustodyItem" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "responsibleUserId" TEXT,
ADD COLUMN     "workOrderCode" TEXT;

-- DropTable
DROP TABLE "PriceListItem";

-- DropEnum
DROP TYPE "PriceListItemType";

-- CreateTable
CREATE TABLE "SpecialOrderPart" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "concept" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "family" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePrice" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ServicePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatheService" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "diameter" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatheService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialOrderPart_workshopId_idx" ON "SpecialOrderPart"("workshopId");

-- CreateIndex
CREATE INDEX "SpecialOrderPart_name_idx" ON "SpecialOrderPart"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialOrderPart_workshopId_sku_key" ON "SpecialOrderPart"("workshopId", "sku");

-- CreateIndex
CREATE INDEX "Service_workshopId_idx" ON "Service"("workshopId");

-- CreateIndex
CREATE INDEX "Service_workshopId_category_idx" ON "Service"("workshopId", "category");

-- CreateIndex
CREATE INDEX "Service_concept_idx" ON "Service"("concept");

-- CreateIndex
CREATE INDEX "ServicePrice_serviceId_idx" ON "ServicePrice"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePrice_serviceId_vehicleType_key" ON "ServicePrice"("serviceId", "vehicleType");

-- CreateIndex
CREATE INDEX "LatheService_workshopId_idx" ON "LatheService"("workshopId");

-- CreateIndex
CREATE INDEX "LatheService_name_idx" ON "LatheService"("name");

-- CreateIndex
CREATE INDEX "CustodyItem_vehicleId_idx" ON "CustodyItem"("vehicleId");

-- CreateIndex
CREATE INDEX "CustodyItem_responsibleUserId_idx" ON "CustodyItem"("responsibleUserId");

-- CreateIndex
CREATE INDEX "StockMovement_actorId_idx" ON "StockMovement"("actorId");

-- AddForeignKey
ALTER TABLE "SpecialOrderPart" ADD CONSTRAINT "SpecialOrderPart_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePrice" ADD CONSTRAINT "ServicePrice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatheService" ADD CONSTRAINT "LatheService_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyItem" ADD CONSTRAINT "CustodyItem_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
