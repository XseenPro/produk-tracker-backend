-- CreateTable
CREATE TABLE "BuyerProduct" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BuyerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProduct_buyerId_productId_key" ON "BuyerProduct"("buyerId", "productId");

-- AddForeignKey
ALTER TABLE "BuyerProduct" ADD CONSTRAINT "BuyerProduct_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProduct" ADD CONSTRAINT "BuyerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
