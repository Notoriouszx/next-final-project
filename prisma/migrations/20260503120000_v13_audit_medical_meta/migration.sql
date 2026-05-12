-- AlterTable
ALTER TABLE "medical_record" ADD COLUMN "fileSize" INTEGER;

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success';
ALTER TABLE "audit_log" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "audit_log_category_idx" ON "audit_log"("category");
