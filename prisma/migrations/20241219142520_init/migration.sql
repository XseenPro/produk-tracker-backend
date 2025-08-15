-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pro_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purh_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "het" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exp_date" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");
