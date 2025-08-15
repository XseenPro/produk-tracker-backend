/*
  Warnings:

  - You are about to drop the column `confirmation` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transactionType` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "position" SET DEFAULT 'Tidak Diberikan';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "confirmation",
DROP COLUMN "transactionType",
ALTER COLUMN "status" SET DEFAULT 'Sedang Dikirim';
