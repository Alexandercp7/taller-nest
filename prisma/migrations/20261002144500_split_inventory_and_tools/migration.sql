-- CreateEnum
CREATE TYPE "ToolCondition" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'DANADO');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('DISPONIBLE', 'EN_USO', 'EN_MANTENIMIENTO', 'DADO_DE_BAJA');

-- AlterTable Article: drop condition, add supplierId, oemNumber, brand, location, isSpecialOrder
ALTER TABLE "Article" DROP COLUMN IF EXISTS "condition";
DROP TYPE IF EXISTS "ArticleCondition";

ALTER TABLE "Article" 
  ADD COLUMN "supplierId" TEXT,
  ADD COLUMN "oemNumber" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "isSpecialOrder" BOOLEAN NOT NULL DEFAULT false;

-- Update ArticleType enum
ALTER TABLE "Article" ALTER COLUMN "type" TYPE TEXT;
DROP TYPE IF EXISTS "ArticleType";
CREATE TYPE "ArticleType" AS ENUM ('PARTE_EN_VENTA', 'CONSUMIBLE');
ALTER TABLE "Article" ALTER COLUMN "type" TYPE "ArticleType" USING ("type"::"ArticleType");

-- AlterTable StockMovement: add unitCost
ALTER TABLE "StockMovement" ADD COLUMN "unitCost" DECIMAL(12,2);

-- CreateTable Tool
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "condition" "ToolCondition" NOT NULL DEFAULT 'BUENO',
    "status" "ToolStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "purchasePrice" DECIMAL(12,2),
    "assignedToUserId" TEXT,
    "lastMaintenanceAt" TIMESTAMP(3),
    "notes" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_supplierId_idx" ON "Article"("supplierId");
CREATE INDEX "Article_oemNumber_idx" ON "Article"("oemNumber");
CREATE INDEX "Tool_workshopId_idx" ON "Tool"("workshopId");
CREATE INDEX "Tool_assignedToUserId_idx" ON "Tool"("assignedToUserId");
CREATE INDEX "Tool_workshopId_status_idx" ON "Tool"("workshopId", "status");
CREATE INDEX "Tool_name_idx" ON "Tool"("name");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
