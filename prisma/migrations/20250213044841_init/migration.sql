/*
  Warnings:

  - You are about to drop the column `transactionDate` on the `Debt` table. All the data in the column will be lost.
  - Added the required column `informasion` to the `Debt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "transactionDate",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "informasion" TEXT NOT NULL;
