/*
  Warnings:

  - You are about to drop the column `faceHash` on the `biometric_auth` table. All the data in the column will be lost.
  - You are about to drop the column `fingerprintHash` on the `biometric_auth` table. All the data in the column will be lost.
  - You are about to drop the column `irisHash` on the `biometric_auth` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "biometric_auth" DROP COLUMN "faceHash",
DROP COLUMN "fingerprintHash",
DROP COLUMN "irisHash",
ADD COLUMN     "embeddingVersion" TEXT NOT NULL DEFAULT 'v6.1',
ADD COLUMN     "faceEmbedding" JSONB,
ADD COLUMN     "faceQuality" DOUBLE PRECISION,
ADD COLUMN     "fingerprintEmbedding" JSONB,
ADD COLUMN     "fingerprintQuality" DOUBLE PRECISION,
ADD COLUMN     "irisEmbedding" JSONB,
ADD COLUMN     "irisQuality" DOUBLE PRECISION,
ADD COLUMN     "normParams" JSONB,
ADD COLUMN     "pcaVersion" TEXT NOT NULL DEFAULT 'v6.1';

-- CreateTable
CREATE TABLE "biometric_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION,
    "modalityUsed" TEXT NOT NULL,
    "fusionWeights" JSONB,
    "responseTime" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_sample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "quality" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "biometric_sample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometric_attempt_userId_idx" ON "biometric_attempt"("userId");

-- CreateIndex
CREATE INDEX "biometric_attempt_createdAt_idx" ON "biometric_attempt"("createdAt");

-- CreateIndex
CREATE INDEX "biometric_attempt_success_idx" ON "biometric_attempt"("success");

-- CreateIndex
CREATE INDEX "biometric_sample_userId_modality_idx" ON "biometric_sample"("userId", "modality");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_sample_userId_modality_isActive_key" ON "biometric_sample"("userId", "modality", "isActive");

-- CreateIndex
CREATE INDEX "biometric_auth_userId_idx" ON "biometric_auth"("userId");

-- AddForeignKey
ALTER TABLE "biometric_attempt" ADD CONSTRAINT "biometric_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_sample" ADD CONSTRAINT "biometric_sample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
