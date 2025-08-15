import { Request, Response } from "express";
import { getTotalProductPerUser, getTotalQuantityPerUser, countExpiringProduct, totalPurchasePrice, getDashboardData, getLatestTransactions } from "./dashboard.service";
import { logger } from "../utils/logger";

export const getDashboardStaticsHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const totalProductPerUser = await getTotalProductPerUser(userId)
    const totalQuantityPerUser = await getTotalQuantityPerUser(userId)
    const totalExpiringProductPerUser = await countExpiringProduct(userId)
    const totalPurchasePricePerUser = await totalPurchasePrice(userId)
    return res.status(200).send({ 
      status: true, 
      statusCode: 200, 
      data: { 
        totalProductPerUser,
        totalQuantityPerUser,
        totalExpiringProductPerUser,
        totalPurchasePricePerUser
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`ERR: dashboard - get overview = ${error.message}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error.message})
    } else {
      logger.error(`ERR: dashboard - get overview = ${error}`)
      return res.status(422).send({ status: false, statusCode: 422, message: error})
    }
  }
}

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const data = await getDashboardData(userId);

    return res.status(200).json({
      status: true,
      message: "Dashboard data retrieved successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve dashboard data",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const getLatestTransactionsHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const transactions = await getLatestTransactions(userId);

    return res.status(200).json({
      status: true,
      message: "Latest transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve latest transactions",
      error: error instanceof Error ? error.message : error,
    });
  }
};