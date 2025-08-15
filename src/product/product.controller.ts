import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { Prisma } from "@prisma/client";
import ProductType from "./product.type";
import { createProduct, fetchAllProduct, fetchProductById, deleteProduct, updateProduct, addProductFromFile, parseExcel, parseNumber, parseInteger } from "./product.service";

export const addProduct = async (req: Request, res: Response) => {
  try {
    const product: ProductType = req.body;
    const userId = res.locals.user.id;
    const productWithUserId = { ...product, userId };

    await createProduct(productWithUserId);

    logger.info("Success add new product");
    return res.status(201).json({
      status: true,
      statusCode: 201,
      message: "Add new product success",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const uniqueField = (error.meta?.target as string[])[0];
      return res.status(422).json({
        status: false,
        statusCode: 422,
        message: `Unique constraint failed on the fields: (${uniqueField})`,
        details: `Product with the same ${uniqueField} already exists for this user.`,
      });
    } else if (error instanceof Error && error.message === "Product with the same name already exists for this user") {
      return res.status(409).json({
        status: false,
        statusCode: 409,
        message: "Conflict: Product already exists",
        details: error.message,
      });
    } else {
      return res.status(500).json({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }
};

export const getProduct = async (req: Request, res: Response) => {
  const {
    params: { id },
  } = req;

  try {
    const userId = res.locals.user.id;

    if (id) {
      const product = await fetchProductById(id, userId);
      if (product) {
        logger.info("Success get product data");
        return res.status(200).send({ status: true, statusCode: 200, data: product });
      } else {
        return res.status(404).send({ status: false, statusCode: 404, message: "Product not found" });
      }
    }

    const { category, name } = req.query;
    const products = await fetchAllProduct({ category: category as string, name: name as string, userId });

    const message = products.length === 0 ? "No Product Available" : "Success get all product";
    logger.info(message);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};

export const deleteProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await deleteProduct(id);
    logger.info(`Product with id ${id} delete successfully`);
    return res.status(200).json({ status: true, statusCode: 200, message: "Product deleted successfully", data: product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        const meta = error.meta as { modelName: string };
        return res.status(404).send({
          status: false,
          statusCode: 404,
          message: `The specified ${meta.modelName} to delete does not exist`,
        });
      }
    } else if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(422).send({ status: false, statusCode: 422, message: error });
    }
  }
};

export const updateProductById = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;
    const userId = res.locals.user.id;

    const updatedProduct = await updateProduct(productId, updateData, userId);
    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: updatedProduct,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Product with the same name already exists for this user") {
      return res.status(409).json({
        status: false,
        statusCode: 409,
        message: "Conflict: Product already exists",
        details: error.message,
      });
    } else if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(500).json({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }
};

export const addProductFromFileHandler = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const file = req.file;
    const userId = res.locals.user.id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return res.status(400).json({ message: "Unsupported file type. Only .xlsx files are allowed." });
    }

    const parsedData = parseExcel(file.buffer);

    const productDataArray = parsedData.map((product) => ({
      ...product,
      userId,
      productPrice: parseNumber(product.productPrice),
      purchasePrice: parseNumber(product.purchasePrice),
      het: parseNumber(product.het),
      quantity: parseInteger(product.quantity),
      expiredDate: product.expiredDate ? formatDate(product.expiredDate) : undefined,
    }));

    const addedProduct = await addProductFromFile(productDataArray);

    return res.status(201).json({ status: true, statusCode: 201, data: addedProduct });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

function formatDate(date: string): Date {
  const [day, month, year] = date.split("-").map(Number);
  if (!day || !month || !year || day > 31 || month > 12) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const parsedDate = new Date(year, month - 1, day);

  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date format: ${date}`);
  }

  return parsedDate;
}