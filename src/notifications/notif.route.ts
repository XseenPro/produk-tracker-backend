import { Router } from "express";
import { verifyToken, requireUser } from "../middlewares/authorization";

import { getAllNotifications, updateNotificationStatus } from "./notif.controller";

export const NotifRouter: Router = Router();

NotifRouter.get("/", verifyToken, requireUser, getAllNotifications)
NotifRouter.put("/:notifId/read", verifyToken, requireUser, updateNotificationStatus)