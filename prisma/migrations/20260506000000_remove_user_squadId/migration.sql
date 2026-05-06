-- DropIndex (if any index exists on squadId)
DROP INDEX IF EXISTS "users_squadId_idx";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_squadId_fkey";

-- AlterTable: remove squadId column
ALTER TABLE "users" DROP COLUMN IF EXISTS "squadId";
