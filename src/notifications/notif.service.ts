import { PrismaClient, Prisma } from "@prisma/client";
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

export const getAllNotifByUser = async (userId: string) => {
  const notification = await prisma.notifications.findMany({
    where: { receiverId: userId },
    select: {
      id: true,
      type: true,
      timestamp: true,
      read_status: true,
      last_updated: true,
    },
    orderBy: {
      timestamp: "desc"
    }
  })

  return notification
}

export const markNotificationAsRead = async (notifId: string, userId: string) => {
  return await prisma.notifications.updateMany({
    where: {
      id: notifId,
      receiverId: userId,
      read_status: false,
    },
    data: {
      read_status: true,
      last_updated: new Date(),
    },
  });
};

export const cleanupOldNotifications = async () => {
  const threeDaysAgo = addDays(new Date(), -3); 

  await prisma.notifications.deleteMany({
    where: {
      read_status: true,
      last_updated: {
        lt: threeDaysAgo,
      },
    },
  });

  console.log('Old notifications cleaned up.');
};
