/*
  Warnings:

  - Made the column `buyerId` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_buyerId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "profit" DROP DEFAULT,
ALTER COLUMN "confirmation" DROP DEFAULT,
ALTER COLUMN "buyerId" SET NOT NULL,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "totalPrice" DROP DEFAULT,
ALTER COLUMN "transactionType" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
