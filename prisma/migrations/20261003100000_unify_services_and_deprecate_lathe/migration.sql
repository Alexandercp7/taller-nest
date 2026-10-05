-- AlterEnum
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'AFINACION_Y_MANTENIMIENTO';
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'FRENOS_Y_SUSPENSION';
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'ELECTRICO_Y_DIAGNOSTICO';
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'TORNO_Y_MAQUINADO';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "code" TEXT,
ADD COLUMN "estimatedMinutes" INTEGER,
ADD COLUMN "basePrice" DECIMAL(12,2),
ADD COLUMN "costPrice" DECIMAL(12,2);

-- CreateIndex
CREATE UNIQUE INDEX "Service_workshopId_code_key" ON "Service"("workshopId", "code");

-- DropTable
DROP TABLE IF EXISTS "LatheService";
