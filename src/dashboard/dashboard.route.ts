import { Router } from "express";
import { getDashboardStaticsHandler, getDashboard, getLatestTransactionsHandler } from "./dashboard.controller";
import { requireUser, verifyToken } from "../middlewares/authorization";

export const DashboardRouter: Router = Router()

DashboardRouter.get('/overview', verifyToken, getDashboardStaticsHandler)
DashboardRouter.get('/summary', verifyToken, getDashboard)
DashboardRouter.get('/latest-transactions', verifyToken, getLatestTransactionsHandler);