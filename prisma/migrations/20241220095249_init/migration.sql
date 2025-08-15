/*
  Warnings:

  - You are about to drop the column `pro_price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purh_price` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "pro_price",
DROP COLUMN "purh_price",
ADD COLUMN     "productPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
