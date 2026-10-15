-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'pilot';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerCaptureId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerCaptureId_key" ON "Payment"("providerCaptureId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

