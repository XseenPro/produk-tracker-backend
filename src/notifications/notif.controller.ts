import { Request, Response } from "express";
import { getAllNotifByUser, markNotificationAsRead, cleanupOldNotifications } from "./notif.service";

export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    await cleanupOldNotifications();
    const notifications = await getAllNotifByUser(userId);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const updateNotificationStatus = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const { notifId } = req.params;

    if (!notifId) {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: "notifId is required",
      });
    }

    const updatedNotif = await markNotificationAsRead(notifId, userId);

    if (updatedNotif.count === 0) {
      return res.status(404).json({
        status: false,
        statusCode: 404,
        message: "Notification not found or already read",
      });
    }

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Notification marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

