import { PrismaClient, User, Role } from "@prisma/client";
import UserType from "./user.type";

const prisma = new PrismaClient();

export const roleHierarchy = ["pembeli", "reseller", "agen", "distributor", "pabrik"] as const;

export const canCreateRole = (currentRole: Role, targetRole: Role): boolean => {
  const currentIndex = roleHierarchy.indexOf(currentRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);

  return targetIndex === currentIndex - 1;
};

export const createUser = async (payload: UserType, createdByUser: User | null) => {
  if (payload.role === "pabrik" && createdByUser?.id === null) {
    const pabrikAccountsCount = await prisma.user.count({
      where: { createdById: null, role: "pabrik" },
    });

    if (pabrikAccountsCount >= 2) {
      await prisma.blacklistedToken.create({
        data: { token: process.env.FIXED_PABRIK_TOKEN || "" },
      });

      throw new Error("Fixed token has reached its limit and is now invalid.");
    }

    const newUser = await prisma.user.create({
      data: {
        username: payload.username,
        password: payload.password,
        email: payload.email,
        role: payload.role as Role,
        tier: payload.tier || "bronze",
        address: payload.address,
        telp: payload.telp,
        logo: null
      },
    });

    return newUser;
  }

  if (!createdByUser) {
    throw new Error("You must be registered by a user with a higher role.");
  }

  if (!canCreateRole(createdByUser.role, payload.role)) {
    throw new Error(`Cannot create user with role ${payload.role}. Only roles below ${createdByUser.role} can be created.`);
  }

  return await prisma.user.create({
    data: {
      username: payload.username,
      password: payload.password,
      email: payload.email,
      role: payload.role as Role,
      tier: payload.tier || "bronze",
      address: payload.address,
      createdById: createdByUser.id,
      telp: payload.telp,
      logo: null
    },
  });
};

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
};

const isValidRole = (role: string): role is Role => {
  return Object.values(Role).includes(role as Role);
};

export const getImmediateLowerRole = (currentRole: Role): Role | null => {
  const index = roleHierarchy.indexOf(currentRole);
  if (index === -1 || index === 0) {
    return null;
  }
  return roleHierarchy[index - 1] as Role;
};

export const getLowerRoles = (currentRole: Role): Role[] => {
  const index = roleHierarchy.indexOf(currentRole);
  if (index === -1) return [];
  return roleHierarchy.slice(0, index) as Role[];
};

export const getUsersByRole = async (requestingUser: User) => {
  const lowerRoles = getLowerRoles(requestingUser.role);

  if (requestingUser.role === 'pabrik') {
    return await prisma.user.findMany({
      where: {
        role: { in: lowerRoles }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        tier: true,
        address: true,
        telp: true,
        createdById: true,
        createdBy: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  const allLowerUsers = await prisma.user.findMany({
    where: {
      OR: [
        { createdById: requestingUser.id },
        { 
          createdBy: { 
            createdById: requestingUser.id 
          } 
        },
        { 
          createdBy: { 
            createdBy: { 
              createdById: requestingUser.id 
            } 
          } 
        }
      ]
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      tier: true,
      address: true,
      telp: true,
      createdById: true,
      createdBy: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  });

  return allLowerUsers.filter(user => lowerRoles.includes(user.role));
};

export const updateUserService = async (
  userId: string,
  updates: { username?: string; address?: string; telp?: string; logo?: Buffer }
) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: updates.username || undefined,
        address: updates.address || undefined,
        telp: updates.telp || undefined,
        logo: updates.logo || undefined,
      },
    });

    return updatedUser;
  } catch (error) {
    throw new Error("Failed to update user");
  }
};

export const getUserSummaryService = async () => {
  try {
    const distributorCount = await prisma.user.count({
      where: { role: "distributor" },
    });

    const agenCount = await prisma.user.count({
      where: { role: "agen" },
    });

    const resellerCount = await prisma.user.count({
      where: { role: "reseller" },
    });

    const pembeliCount = await prisma.user.count({
      where: { role: "pembeli" },
    });

    return {
      distributor: distributorCount,
      agen: agenCount,
      reseller: resellerCount,
      pembeli: pembeliCount,
    };
  } catch (error) {
    throw new Error("Failed to retrieve user summary");
  }
};

export const getUserDetailService = async (requestingUser: User, targetUserId: string) => {
  const targetUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
      createdById: requestingUser.id,
    },
  });
  if (!targetUser) {
    throw new Error("User not found");
  }
  const profile = {
    id: targetUser.id,
    username: targetUser.username,
    role: targetUser.role,
  };
  const transactions = {
    penjualan: await prisma.transaction.findMany({
      where: { sellerId: targetUserId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        buyer: { select: { username: true } },
      },
    }),
    pembelian: await prisma.transaction.findMany({
      where: { buyerId: targetUserId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        seller: { select: { username: true } },
      },
    }),
  };

  const debts = {
    hutang: await prisma.debt.findMany({
      where: { buyerId: targetUserId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        seller: { select: { username: true } },
      },
    }),
    piutang: await prisma.debt.findMany({
      where: { sellerId: targetUserId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        buyer: { select: { username: true } },
      },
    }),
    totalSeluruhHutang: await prisma.debt
      .aggregate({
        where: { buyerId: targetUserId },
        _sum: { amount: true },
      })
      .then((res) => res._sum.amount || 0),
    totalSeluruhPiutang: await prisma.debt
      .aggregate({
        where: { sellerId: targetUserId },
        _sum: { amount: true },
      })
      .then((res) => res._sum.amount || 0),
  };

  const products = await prisma.product.findMany({
    where: { userId: targetUserId },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return {
    profile,
    transactions,
    debts,
    products,
  };
};
