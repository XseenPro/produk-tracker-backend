-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'sedang dikirim';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telp" INTEGER NOT NULL DEFAULT 0;
