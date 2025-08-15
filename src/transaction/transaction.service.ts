import { PrismaClient } from "@prisma/client";
import { getIO } from "../utils/socket";

const prisma = new PrismaClient();

export const sellProduct = async (transactionsData: Array<{ productId: string; buyerId: string; sellerId: string; quantity: number; status: string; name?: string; telp?: string; address?: string; paybydebt?: boolean }>) => {
  const createdTransactions = [];

  for (const transactionData of transactionsData) {
    const { productId, buyerId, sellerId, quantity, status, name, telp, address, paybydebt } = transactionData;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    if (product.quantity < quantity) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error(`Seller with ID ${sellerId} not found`);
    }

    let finalStatus = status;
    if (seller.role === "reseller") {
      finalStatus = "selesai";
    }

    let resolvedBuyerId: string;
    if (seller.role === "reseller") {
      if (!name || !telp || !address) {
        throw new Error("Name, phone number, and address are required for reseller transactions.");
      }

      let buyer = await prisma.user.findFirst({
        where: { telp: telp },
      });

      if (!buyer) {
        const sanitizedUsername = name.replace(/\s+/g, "").toLowerCase();
        buyer = await prisma.user.create({
          data: {
            username: name,
            email: `${sanitizedUsername}@example.com`,
            role: "pembeli",
            password: `${sanitizedUsername}`,
            telp,
            address,
            createdById: sellerId,
          },
        });
      }
      resolvedBuyerId = buyer.id;
    } else {
      if (!buyerId) {
        throw new Error("Buyer ID is required for non-reseller transactions.");
      }

      const buyer = await prisma.user.findUnique({
        where: { id: buyerId },
      });

      if (!buyer) {
        throw new Error("Buyer not found");
      }

      resolvedBuyerId = buyerId;
    }

    const totalPrice = product.productPrice * quantity;
    const profit = totalPrice - product.purchasePrice * quantity;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          productId,
          buyerId: resolvedBuyerId,
          sellerId,
          quantity,
          totalPrice,
          profit,
          status: finalStatus,
        },
      });

      if (paybydebt) {
        await tx.debt.create({
          data: {
            buyerId: resolvedBuyerId,
            sellerId,
            amount: totalPrice,
            productId,
            createdAt: new Date(),
          },
        });
      }

      await tx.product.update({
        where: { id: productId },
        data: { quantity: product.quantity - quantity },
      });

      const notification = await tx.notifications.create({
        data: {
          senderId: sellerId,
          receiverId: resolvedBuyerId,
          type: "TRANSACTION_CREATED",
        },
      });

      return { transaction, notification };
    });

    const io = getIO();
    io.emit("notification", result.notification);

    createdTransactions.push(result.transaction);
  }

  return createdTransactions;
};

export const getAllTransactionsByUser = async (userId: string) => {
  const penjualan = await prisma.transaction.findMany({
    where: { sellerId: userId },
    include: {
      product: {
        select: { id: true, name: true },
      },
      buyer: {
        select: { username: true },
      },
    },
  });

  const pembelian = await prisma.transaction.findMany({
    where: { buyerId: userId },
    include: {
      product: {
        select: { id: true, name: true },
      },
      seller: {
        select: { username: true },
      },
    },
  });

  return {
    penjualan: penjualan.map((transaction) => ({
      id: transaction.id,
      createdAt: transaction.createdAt,
      status: transaction.status,
      profit: transaction.profit,
      totalPrice: transaction.totalPrice,
      quantity: transaction.quantity,
      product: transaction.product,
      buyer: transaction.buyer,
    })),
    pembelian: pembelian.map((transaction) => ({
      id: transaction.id,
      createdAt: transaction.createdAt,
      status: transaction.status,
      profit: transaction.profit,
      totalPrice: transaction.totalPrice,
      quantity: transaction.quantity,
      product: transaction.product,
      seller: transaction.seller,
    })),
  };
};

export const updateTransaction = async (
  transactionId: string, 
  updateData: Partial<any>, 
  userId: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan");
  }

  if (updateData.status === "selesai") {
    if (transaction.buyerId !== userId) {
      throw new Error("Hanya pembeli yang dapat menandai transaksi sebagai selesai");
    }
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: updateData,
  });

  if (updatedTransaction.status === "selesai") {
    const product = await prisma.product.findUnique({
      where: { id: updatedTransaction.productId },
    });

    if (!product) {
      throw new Error("Produk tidak ditemukan untuk memperbarui inventaris pembeli");
    }

    const buyerProduct = await prisma.product.findFirst({
      where: {
        name: product.name,
        userId: updatedTransaction.buyerId,
      },
    });

    if (buyerProduct) {
      await prisma.product.update({
        where: { id: buyerProduct.id },
        data: {
          quantity: buyerProduct.quantity + updatedTransaction.quantity,
        },
      });
    } else {
      await prisma.product.create({
        data: {
          name: product.name,
          category: product.category,
          productPrice: product.productPrice,
          purchasePrice: product.purchasePrice,
          het: product.het,
          expiredDate: product.expiredDate,
          quantity: updatedTransaction.quantity,
          position: product.position,
          userId: updatedTransaction.buyerId,
        },
      });
    }

    const notification = await prisma.notifications.create({
      data: {
        senderId: updatedTransaction.buyerId,
        receiverId: updatedTransaction.sellerId,
        type: "TRANSACTION_COMPLETED",
        timestamp: new Date(),
        read_status: false, 
      },
    });

    const io = getIO();
    io.emit("notification", notification);
  }

  return updatedTransaction;
};

export const getTransactionById = async (transactionId: string) => {
  return prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      product: true,
      buyer: {
        select: { username: true, email: true },
      },
      seller: {
        select: { username: true, email: true },
      },
    },
  });
};
