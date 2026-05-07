-- AlterTable
ALTER TABLE "debt_records" ADD COLUMN     "debtorId" TEXT,
ALTER COLUMN "debtorName" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "debt_records" ADD CONSTRAINT "debt_records_debtorId_fkey" FOREIGN KEY ("debtorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
