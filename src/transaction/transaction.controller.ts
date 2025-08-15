import { Request, Response } from "express";
import { sellProduct, getAllTransactionsByUser, updateTransaction, getTransactionById } from "./transaction.service";
import { logger } from "../utils/logger";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TransactionData {
  productId: string;
  buyerId: string;
  quantity: number;
  status: string;
  name?: string;
  telp?: string;
  address?: string;
  paybydebt?: boolean;
}

export const processSellProduct = async (req: Request, res: Response) => {
  try {
    const transactionsData: TransactionData[] = req.body.transactions;
    const sellerId = res.locals.user.id;

    const transactions = await sellProduct(transactionsData.map((data: TransactionData) => ({
      ...data,
      sellerId, 
    })));

    return res.status(201).json({
      status: true,
      message: 'Transactions processed successfully',
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};

export const getTransactionsByUser = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const transactions = await getAllTransactionsByUser(userId);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: transactions,
    });
  } catch (error) {
    console.error(`Error fetching transactions: ${error}`);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const updateTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = res.locals.user.id;

    const updatedTransaction = await updateTransaction(id, updateData, userId);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};


export const getTransactionByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({
        status: false,
        statusCode: 404,
        message: "Transaction not found",
      });
    }

    logger.info("Fetched transaction details");
    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: transaction,
    });
  } catch (error) {
    logger.error("Error fetching transaction by ID: ${error}");
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};







