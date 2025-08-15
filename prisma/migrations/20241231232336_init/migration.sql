/*
  Warnings:

  - You are about to drop the `BuyerProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BuyerProduct" DROP CONSTRAINT "BuyerProduct_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "BuyerProduct" DROP CONSTRAINT "BuyerProduct_productId_fkey";

-- DropTable
DROP TABLE "BuyerProduct";
