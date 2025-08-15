import { Router } from "express";
import { verifyToken, requireUser } from "../middlewares/authorization";
import { getTransactionSummaryHandler, getSalesAndPurchasesSummaryHandler, getProfitSummaryHandler, getTopProductsHandler, getDebtDataByUserHandler, getDebtByIdHandler, updateDebtPaymentHandler } from "./report.controller";

export const ReportRouter: Router = Router();

ReportRouter.get("/", verifyToken, requireUser, getTransactionSummaryHandler)
ReportRouter.get("/total", verifyToken, requireUser, getSalesAndPurchasesSummaryHandler)
ReportRouter.get("/profit", verifyToken, requireUser, getProfitSummaryHandler);
ReportRouter.get("/top-product", verifyToken, requireUser, getTopProductsHandler);
ReportRouter.get("/debt-data", verifyToken, requireUser, getDebtDataByUserHandler);
ReportRouter.get("/debt-data/:id", verifyToken, requireUser, getDebtByIdHandler);
ReportRouter.put("/update-debts/:debtId", verifyToken, requireUser, updateDebtPaymentHandler);
