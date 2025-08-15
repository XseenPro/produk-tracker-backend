import { Router } from "express";
import { processSellProduct, getTransactionsByUser, updateTransactionById, getTransactionByIdHandler } from "./transaction.controller";
import { verifyToken, requireUser } from "../middlewares/authorization";

export const TransactionRouter: Router = Router();

TransactionRouter.post("/sell", verifyToken, requireUser, processSellProduct);
TransactionRouter.get("/user", verifyToken, requireUser, getTransactionsByUser);
TransactionRouter.put("/:id", verifyToken, requireUser, updateTransactionById);
TransactionRouter.get("/:id", verifyToken, requireUser, getTransactionByIdHandler);




