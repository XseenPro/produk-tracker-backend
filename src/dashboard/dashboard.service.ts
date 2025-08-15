import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTotalProductPerUser = async (userId: string) => {
  return await prisma.product.count({
    where: {
      userId: userId,
    },
  });
};

export const getTotalQuantityPerUser = async (userId: string) => {
  const result = await prisma.product.aggregate({
    where: {
      userId: userId,
    },
    _sum: {
      quantity: true,
    },
  });
  return result._sum.quantity || 0;
};

export const countExpiringProduct = async (userId: string) => {
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  return prisma.product.count({
    where: {
      userId,
      expiredDate: {
        gte: today,
        lte: next30Days,
      },
    },
  });
};

export const totalPurchasePrice = async (userId: string) => {
  const result = await prisma.product.aggregate({
    where: {
      userId: userId,
    },
    _sum: {
      purchasePrice: true,
    },
  });
  return result._sum.purchasePrice || 0;
};

export const getDashboardData = async (userId: string) => {
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(currentMonthStart);
  lastMonthStart.setMonth(currentMonthStart.getMonth() - 1);

  const lastMonthEnd = new Date(currentMonthStart);
  lastMonthEnd.setDate(0);

  const currentMonthRevenue = await prisma.transaction.aggregate({
    where: {
      sellerId: userId,
      createdAt: {
        gte: currentMonthStart,
      },
    },
    _sum: {
      totalPrice: true,
    },
  });

  const lastMonthRevenue = await prisma.transaction.aggregate({
    where: {
      sellerId: userId,
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    _sum: {
      totalPrice: true,
    },
  });

  const currentMonthRevenueSum = currentMonthRevenue._sum?.totalPrice || 0;
  const lastMonthRevenueSum = lastMonthRevenue._sum?.totalPrice || 0;

  const revenueChange = calculatePercentageChange(
    lastMonthRevenueSum,
    currentMonthRevenueSum
  );

  const currentMonthCustomers = await prisma.transaction.groupBy({
    by: ["buyerId"],
    where: {
      createdAt: {
        gte: currentMonthStart,
      },
      buyer: {
        createdById: userId,
      },
      NOT: {
        buyerId: {
          in: await prisma.transaction.findMany({
            where: {
              createdAt: {
                lt: currentMonthStart,
              },
            },
            select: { buyerId: true },
          }).then((res) => res.map((r) => r.buyerId)),
        },
      },
    },
  });

  const lastMonthCustomers = await prisma.transaction.groupBy({
    by: ["buyerId"],
    where: {
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      buyer: {
        createdById: userId,
      },
      NOT: {
        buyerId: {
          in: await prisma.transaction.findMany({
            where: {
              createdAt: {
                lt: lastMonthStart,
              },
            },
            select: { buyerId: true },
          }).then((res) => res.map((r) => r.buyerId)),
        },
      },
    },
  });

  const currentMonthCustomerCount = currentMonthCustomers.length;
  const lastMonthCustomerCount = lastMonthCustomers.length;

  const customersChange = calculatePercentageChange(
    lastMonthCustomerCount,
    currentMonthCustomerCount
  );

  const currentMonthSalesTransactions = await prisma.transaction.count({
    where: {
      sellerId: userId,
      createdAt: {
        gte: currentMonthStart,
      },
    },
  });

  const lastMonthSalesTransactions = await prisma.transaction.count({
    where: {
      sellerId: userId,
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  });

  const salesChange = calculatePercentageChange(
    lastMonthSalesTransactions,
    currentMonthSalesTransactions
  );

  const currentMonthPurchaseTransactions = await prisma.transaction.count({
    where: {
      buyerId: userId,
      createdAt: {
        gte: currentMonthStart,
      },
    },
  });

  const lastMonthPurchaseTransactions = await prisma.transaction.count({
    where: {
      buyerId: userId,
      createdAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  });

  const purchaseChange = calculatePercentageChange(
    lastMonthPurchaseTransactions,
    currentMonthPurchaseTransactions
  );

  return {
    totalRevenue: currentMonthRevenueSum,
    revenueChange,
    totalCustomers: currentMonthCustomerCount,
    customersChange,
    totalSalesTransactions: currentMonthSalesTransactions,
    salesChange,
    totalPurchaseTransactions: currentMonthPurchaseTransactions,
    purchaseChange,
  };
};

const calculatePercentageChange = (oldValue: number, newValue: number) => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

export const getLatestTransactions = async (userId: string) => {
  return await prisma.transaction.findMany({
    where: {
      sellerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      product: {
        select: {
          name: true,
        },
      },
      buyer: {
        select: {
          username: true,
          email: true,
        },
      },
      totalPrice: true,
    },
  });
};


