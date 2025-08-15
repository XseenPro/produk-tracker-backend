/*
  Warnings:

  - You are about to drop the column `exp_date` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "exp_date",
ADD COLUMN     "expiredDate" TIMESTAMP(3);
