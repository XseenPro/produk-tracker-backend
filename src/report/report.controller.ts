import { Request, Response } from "express";
import { getTransactionSummary, getSalesAndPurchasesSummary, getProfitSummary, getTopProducts, getDebtDataByUser, getDebtById, updateDebtPayment } from "./report.service";


export const getTransactionSummaryHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id; 
    const data = await getTransactionSummary(userId); 
    return res.status(200).json({ status: true, data }); 
  } catch (error) {
    console.error('Error in getTransactionSummaryHandler:', error);
    return res.status(500).send({ status: false, message: 'Failed to retrieve transaction summary' });
  }
};

export const getSalesAndPurchasesSummaryHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const data = await getSalesAndPurchasesSummary(userId);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in getSalesAndPurchasesSummaryHandler:", error);
    return res.status(500).send({ status: false, message: "Failed to retrieve sales and purchases summary" });
  }
};

export const getProfitSummaryHandler = async (req: Request, res: Response) => {
  try {
    const data = await getProfitSummary();
    return res.status(200).json({ status: true, data });
  } catch (error) {
    console.error("Error in getProfitSummaryHandler:", error);
    return res.status(500).send({ status: false, message: "Failed to retrieve profit summary" });
  }
};

export const getTopProductsHandler = async (req: Request, res: Response) => {
  try {
    const data = await getTopProducts();
    return res.status(200).json({ status: true, data });
  } catch (error) {
    console.error("Error in getTopProductsHandler:", error);
    return res.status(500).send({ status: false, message: "Failed to retrieve top products" });
  }
};

export const getDebtDataByUserHandler = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const debtData = await getDebtDataByUser(userId);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: debtData, 
    });
  } catch (error) {
    console.error("Error fetching debt data:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const getDebtByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const debtData = await getDebtById(id);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: debtData,
    });
  } catch (error) {
    console.error("Error fetching debt by id:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const updateDebtPaymentHandler = async (req: Request, res: Response) => {
  try {
    if (!res.locals.user || !res.locals.user.id) {
      return res.status(401).json({
        status: false,
        statusCode: 401,
        message: "User tidak terautentikasi",
      });
    }

    const sellerId = res.locals.user.id;
    const { debtId } = req.params;
    const { paymentAmount, paymentNote } = req.body;

    const updatedDebt = await updateDebtPayment(debtId, sellerId, paymentAmount, paymentNote);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      // data: updatedDebt,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: error.message || "Internal server error",
    });
  }
};