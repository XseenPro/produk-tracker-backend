import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";
import { getIO } from "../utils/socket";

const prisma = new PrismaClient();

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const getTransactionSummary = async (userId: string) => {
  try {
    const salesTransactions = await prisma.transaction.aggregate({
      _sum: {
        totalPrice: true, 
        profit: true,    
      },
      _count: {
        id: true,  
      },
      where: {
        sellerId: userId,  
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1), 
          lte: new Date(),
        },
      },
    });

    const purchaseTransactions = await prisma.transaction.aggregate({
      _sum: {
        totalPrice: true,  
        profit: true, 
      },
      _count: {
        id: true,  
      },
      where: {
        buyerId: userId, 
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1), 
          lte: new Date(),
        },
      },
    });

    const itemsSoldTransactions = await prisma.transaction.findMany({
      where: {
        sellerId: userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(),
        },
      },
    });

    const itemsPurchasedTransactions = await prisma.transaction.findMany({
      where: {
        buyerId: userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(), 
        },
      },
    });

    let itemsSold = 0;
    let itemsPurchased = 0;

    itemsSoldTransactions.forEach((transaction) => {
      itemsSold += transaction.quantity;
    });

    itemsPurchasedTransactions.forEach((transaction) => {
      itemsPurchased += transaction.quantity;
    });

    const summaryData = {
      totalSales: salesTransactions._count.id,         
      totalPurchases: purchaseTransactions._count.id, 
      salesRevenue: salesTransactions._sum.totalPrice || 0,
      purchaseExpenses: purchaseTransactions._sum.totalPrice || 0, 
      netProfit: (salesTransactions._sum.profit || 0) - (purchaseTransactions._sum.profit || 0), 
      itemsSold,
      itemsPurchased, 
      transactionStatus: {
        cancelled: 0,  
        returned: 0,   
        shipping: 0,   
        completed: 0,
      },
    };

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { sellerId: userId }, 
          { buyerId: userId },  
        ],
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1), 
          lte: new Date(),
        },
      },
    });

    transactions.forEach((transaction) => {
      if (transaction.status === 'dibatalkan') {
        summaryData.transactionStatus.cancelled += 1;
      } else if (transaction.status === 'dikembalikan') {
        summaryData.transactionStatus.returned += 1;
      } else if (transaction.status === 'sedang dikirim') {
        summaryData.transactionStatus.shipping += 1;
      } else if (transaction.status === 'selesai') {
        summaryData.transactionStatus.completed += 1;
      }
    });

    return summaryData;

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    throw new Error('Failed to retrieve transaction summary.');
  }
};

export const getSalesAndPurchasesSummary = async (userId: string) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { sellerId: userId },
          { buyerId: userId },
        ],
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(),
        },
      },
    });

    const salesPurchasesPerMonth: Record<string, { month: string; sales: number; purchases: number }> = {};

    transactions.forEach((transaction) => {
      const monthYear = format(transaction.createdAt, "yyyy-MM");
      const month = format(transaction.createdAt, "MMM");

      if (!salesPurchasesPerMonth[monthYear]) {
        salesPurchasesPerMonth[monthYear] = { month, sales: 0, purchases: 0 };
      }

      if (transaction.sellerId === userId) {
        salesPurchasesPerMonth[monthYear].sales += transaction.totalPrice;
      }

      if (transaction.buyerId === userId) {
        salesPurchasesPerMonth[monthYear].purchases += transaction.totalPrice;
      }
    });

    const currentMonthIndex = new Date().getMonth();
    const reorderedMonths = [
      ...months.slice(currentMonthIndex + 1),
      ...months.slice(0, currentMonthIndex + 1),
    ];

    const result = reorderedMonths.map((month, index) => {
      const monthYear = `${new Date().getFullYear()}-${String((index + currentMonthIndex + 1) % 12 + 1).padStart(2, "0")}`;
      const data = salesPurchasesPerMonth[monthYear];

      if (data) {
        return data;
      } else {
        return { month, sales: 0, purchases: 0 };
      }
    });

    return {
      status: true,
      message: "Successfully retrieved user monthly transaction recap.",
      data: result,
    };
  } catch (error) {
    console.error("Error fetching sales and purchases summary:", error);
    throw new Error("Failed to retrieve sales and purchases summary.");
  }
};

export const getProfitSummary = async () => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(),
        },
      },
    });


    const profitPerMonth: Record<string, { month: string; profit: number }> = {};

    transactions.forEach((transaction) => {
      const monthYear = format(transaction.createdAt, "yyyy-MM"); 
      const month = format(transaction.createdAt, "MMM");

      if (!profitPerMonth[monthYear]) {
        profitPerMonth[monthYear] = { month, profit: 0 };
      }

      profitPerMonth[monthYear].profit += transaction.profit;
    });

    const currentMonthIndex = new Date().getMonth();

    const reorderedMonths = [
      ...months.slice(currentMonthIndex + 1),
      ...months.slice(0, currentMonthIndex + 1),
    ];

    const result = reorderedMonths.map((month, index) => {
      const monthYear = `${new Date().getFullYear()}-${String((index + currentMonthIndex + 1) % 12 + 1).padStart(2, "0")}`;
      const data = profitPerMonth[monthYear];

      if (data) {
        return data;
      } else {
        return { month, profit: 0 };
      }
    });

    return result;
  } catch (error) {
    console.error("Error fetching profit summary:", error);
    throw new Error("Failed to retrieve profit summary.");
  }
};

export const getTopProducts = async () => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        product: true,
      },
    });

    const productSales: Record<string, { name: string; sales: number }> = {};

    transactions.forEach((transaction) => {
      const productName = transaction.product.name;
      if (!productSales[productName]) {
        productSales[productName] = { name: productName, sales: 0 };
      }
      productSales[productName].sales += transaction.quantity;
    });


    const productSalesArray = Object.values(productSales);

    productSalesArray.sort((a, b) => b.sales - a.sales);

    const topProducts = productSalesArray.slice(0, 4);

    const otherSales = productSalesArray.slice(4).reduce((total, product) => total + product.sales, 0);

    if (otherSales > 0) {
      topProducts.push({ name: "lain-lain", sales: otherSales });
    }

    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const formattedCurrentDate = format(currentDate, "MMM yyyy");
    const formattedLastMonth = format(lastMonth, "MMM yyyy");

    const lastMonthSales = await getSalesInMonth(lastMonth);
    const currentMonthSales = await getSalesInMonth(currentDate);

    const trendPercentage = lastMonthSales > 0
      ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100
      : 0;

    return {
      data: topProducts,
      dateRange: `${formattedLastMonth} - ${formattedCurrentDate}`,
      trendPercentage,
    };
  } catch (error) {
    console.error("Error fetching top products:", error);
    throw new Error("Failed to retrieve top products.");
  }
};

const getSalesInMonth = async (date: Date) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), 1),
        lte: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      },
    },
  });

  return transactions.reduce((total, transaction) => total + transaction.quantity, 0);
};

export const getDebtDataByUser = async (userId: string) => {
  const hutangRecords = await prisma.debt.findMany({
    where: { buyerId: userId },
    include: { 
      seller: {
        select: { 
          username: true,
          email: true,
          role: true,
          tier: true,
          address: true,
          telp: true,
        }
      }
    },
  });

  const piutangRecords = await prisma.debt.findMany({
    where: { sellerId: userId },
    include: { 
      buyer: {
        select: { 
          username: true,
          email: true,
          role: true,
          tier: true,
          address: true,
          telp: true,
        }
      }
    },
  });

  const hutangMap = hutangRecords.map((debt) => ({
    id: debt.id,
    username: debt.seller.username,
    email: debt.seller.email,
    address: debt.seller.address,
    role: debt.seller.role,
    telp: debt.seller.telp,
    date: debt.createdAt,  
    totalHutang: debt.amount,
    status: debt.amount === 0 ? "lunas" : "belum lunas",
  }));

  const piutangMap = piutangRecords.map((debt) => ({
    id: debt.id,
    username: debt.buyer.username,
    email: debt.buyer.email,
    address: debt.buyer.address,
    role: debt.buyer.role,
    telp: debt.buyer.telp,
    date: debt.createdAt,    
    totalPiutang: debt.amount,
    status: debt.amount === 0 ? "lunas" : "belum lunas",
  }));

  const totalSeluruhHutang = hutangRecords.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSeluruhPiutang = piutangRecords.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    totalSeluruhHutang,
    totalSeluruhPiutang,
    hutang: hutangMap,
    piutang: piutangMap,
  };
};

export const getDebtById = async (debtId: string) => {
  const debtRecord = await prisma.debt.findUnique({
    where: { id: debtId },
    include: {
      buyer: {
        select: {
          username: true,
          email: true,
          role: true,
          tier: true,
          address: true,
          telp: true,
        },
      },
      seller: {
        select: {
          username: true,
          email: true,
          role: true,
          tier: true,
          address: true,
          telp: true,
        },
      },
      product: {
        select: {
          name: true,
          category: true,
          expiredDate: true,
          quantity: true,
        },
      },
      debtHistory: {
        select: {
          paymentAmount: true,
          paymentNote: true,
          createdAt: true,
        },
      },
    },
  });

  if (!debtRecord) {
    throw new Error("Data hutang tidak ditemukan");
  }

  return {
    id: debtRecord.id,
    debitur: debtRecord.buyer,
    kreditur: debtRecord.seller,
    product: debtRecord.product,
    amount: debtRecord.amount,
    status: debtRecord.amount === 0 ? "lunas" : "belum lunas",
    date: debtRecord.createdAt,
    riwayat: debtRecord.debtHistory
  };
};

export const updateDebtPayment = async (
  debtId: string,
  sellerId: string,
  paymentAmount: number,
  paymentNote?: string
) => {
  const debtRecord = await prisma.debt.findUnique({
    where: { id: debtId },
  });

  if (!debtRecord) {
    throw new Error("Data hutang tidak ditemukan");
  }

  if (debtRecord.sellerId !== sellerId) {
    throw new Error("Hanya seller yang dapat memperbarui pembayaran hutang");
  }

  if (paymentAmount > debtRecord.amount) {
    throw new Error("Jumlah pembayaran melebihi sisa hutang");
  }

  const newDebtAmount = debtRecord.amount - paymentAmount;
  const isPaid = newDebtAmount === 0;

  const updatedDebt = await prisma.debt.update({
    where: { id: debtId },
    data: {
      amount: newDebtAmount,
      isPaid: isPaid,
    },
  });

  await prisma.debtPayment.create({
    data: {
      debtId: debtRecord.id,
      sellerId: debtRecord.sellerId,
      buyerId: debtRecord.buyerId,
      paymentAmount,
      paymentNote,
    },
  });

  const notification = await prisma.notifications.create({
    data: {
      senderId: sellerId,
      receiverId: debtRecord.buyerId,
      type: "DEBT_UPDATED"
    }
  })
  const io = getIO();
  io.emit("notification", notification);

  return updatedDebt;
};

