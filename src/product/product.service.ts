import { PrismaClient, Prisma } from "@prisma/client";
import ProductType from "./product.type";
import * as XLSX from "xlsx";
import { getIO } from "../utils/socket";

const prisma = new PrismaClient();
export const createProduct = async (productData: ProductType & { userId: string }) => {
  const exp_date = productData.expiredDate || undefined;
  const position_pro = productData.position || "not set";

  const existingProduct = await prisma.product.findFirst({
    where: { name: productData.name, userId: productData.userId },
  });

  if (existingProduct) {
    throw new Error("Product with the same name already exists for this user");
  }

  return prisma.product.create({
    data: {
      name: productData.name,
      category: productData.category,
      productPrice: productData.productPrice,
      purchasePrice: productData.purchasePrice,
      het: productData.het,
      expiredDate: exp_date,
      quantity: productData.quantity,
      position: position_pro,
      userId: productData.userId,
    },
  });
};

export const fetchAllProduct = async (filter?: { category?: string; name?: string; userId?: string }) => {
  return prisma.product.findMany({
    where: {
      ...(filter?.userId && { userId: filter.userId }),
      ...(filter?.category && { category: filter.category }),
      ...(filter?.name && { name: { contains: filter.name, mode: "insensitive" } }),
    },
    select: {
      id: true,
      name: true,
      category: true,
      productPrice: true,
      purchasePrice: true,
      het: true,
      expiredDate: true,
      quantity: true,
      createdAt: true,
      position: true,
    },
  });
};

export const fetchProductByName = async (name: string, userId: string) => {
  return await prisma.product.findFirst({
    where: { name, userId},
    select: {
      id: true,
      name: true,
      category: true,
      productPrice: true,
      purchasePrice: true,
      het: true,
      expiredDate: true,
      quantity: true,
      createdAt: true,
      position: true,
    },
  })
}

export const fetchProductById = async (id: string, userId: string) => {
  return await prisma.product.findFirst({
    where: { id, userId }, 
    select: {
      id: true,
      name: true,
      category: true,
      productPrice: true,
      purchasePrice: true,
      het: true,
      expiredDate: true,
      quantity: true,
      createdAt: true,
      position: true,
    },
  });
};

export const deleteProduct = async (id: string) => {
  return prisma.product.delete({
    where: {
      id,
    },
  });
};

export const updateProduct = async (id: string, productData: Partial<ProductType>, userId: string) => {
  const currentData = await prisma.product.findUnique({ where: { id } });
  const exp_date = productData.expiredDate || undefined;
  const position_pro = productData.position || "not set";

  if (!currentData) {
    throw new Error("Invalid Product id");
  }

  if (currentData.userId !== userId) {
    throw new Error("You do not have permission to update this product");
  }

  if (productData.name && productData.name !== currentData.name) {
    const existingProduct = await prisma.product.findFirst({
      where: { name: productData.name, userId },
    });

    if (existingProduct) {
      throw new Error("Product with the same name already exists for this user");
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      name: productData.name,
      category: productData.category,
      productPrice: productData.productPrice,
      purchasePrice: productData.purchasePrice,
      het: productData.het,
      expiredDate: exp_date,
      quantity: productData.quantity,
      position: position_pro,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdById: true, role: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "pabrik" && user.createdById !== null) {
    const creator = await prisma.user.findUnique({
      where: { id: user.createdById },
      select: { id: true, username: true, role: true },
    });

    if (creator) {
      const notification = await prisma.notifications.create({
        data: {
          senderId: userId,
          receiverId: creator.id,
          type: "PRODUCT_UPDATED",
        },
      });

      const io = getIO();
      io.emit("notification", notification);
    }
  }

  return updatedProduct;
};

export const addProductFromFile = async (productDataArray: ProductType[]) => {
  const addedProduct = [];
  const productArray = productDataArray[0].name ? productDataArray : transformData(productDataArray);

  for (const productData of productArray) {
    if (!productData.name) {
      throw new Error(`"name" column cannot be empty: ${JSON.stringify(productData)}`);
    }
    if (!productData.category) {
      throw new Error(`"category" column cannot be empty: ${JSON.stringify(productData)}`);
    }
    if (productData.productPrice === undefined || productData.productPrice === null) {
      throw new Error(`"productPrice" column cannot be empty: ${JSON.stringify(productData)}`);
    }
    if (productData.quantity === undefined || productData.quantity === null) {
      throw new Error(`"quantity" column cannot be empty: ${JSON.stringify(productData)}`);
    }
    if (!productData.position) {
      throw new Error(`"position" column cannot be empty: ${JSON.stringify(productData)}`);
    }
    if (!productData.expiredDate) {
      throw new Error(`"expiredDate" column cannot be empty: ${JSON.stringify(productData)}`);
    }

    const newProduct = await prisma.product.create({
      data: {
        name: productData.name,
        category: productData.category,
        productPrice: productData.productPrice,
        purchasePrice: productData.purchasePrice ?? 0,
        het: productData.het ?? 0,
        expiredDate: productData.expiredDate,
        quantity: productData.quantity,
        position: productData.position,
        userId: productData.userId,
      },
    });
    addedProduct.push(newProduct);
  }
  return addedProduct;
};

export const parseExcel = (buffer: Buffer): any[] => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

  return jsonData.map((item: any) => ({
    ...item,
    productPrice: parseFloat(item.productPrice) || 0,
    purchasePrice: parseFloat(item.purchasePrice) || 0,
    het: parseFloat(item.het) || 0,
    quantity: parseInt(item.quantity, 10) || 0,
  }));
};

export function formatDate(date: string | Date | number): Date {
  if (date instanceof Date) {
    return date; 
  }

  if (typeof date === "number") {
    return new Date(date); 
  }

  if (typeof date !== "string") {
    throw new Error(`Invalid input type for date: ${typeof date}`);
  }

  const [day, month, year] = date.split("-").map(Number);

  if (!day || !month || !year || day > 31 || month > 12) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const parsedDate = new Date(year, month - 1, day); 

  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }

  return parsedDate;
}

function transformData(data: any[]) {
  return data.map((item) => {
    const csvData = item[Object.keys(item)[0]];

    const [
      name,
      category,
      productPriceStr,
      purchasePriceStr,
      expiredDateStr,
      hetStr,
      quantityStr,
      position,
      userId,
    ] = csvData.split(",");

    const productPrice = parseFloat(productPriceStr) || 0;
    const purchasePrice = parseFloat(purchasePriceStr) || 0;
    const het = parseFloat(hetStr) || 0;
    const quantity = parseInt(quantityStr, 10) || 0;
    const expiredDate = expiredDateStr ? formatDate(expiredDateStr) : undefined;

    return {
      name: name || "Unknown Product",
      category: category || "Uncategorized",
      productPrice,
      purchasePrice,
      het,
      quantity,
      expiredDate,
      position: position || "Unknown",
      userId: userId || "system",
    };
  });
}

export function parseNumber(value: string | number) {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value)
    if (isNaN(parsedValue)){
      throw new Error(`Invalid number format: ${value}`)
    }
    return parsedValue
  }
  throw new Error(`Invalid input type for number: ${ typeof value }`)
}

export function parseInteger(value: string | number): number {
  if (typeof value === "number") {
    return Math.floor(value); 
  }

  if (typeof value === "string") {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new Error(`Invalid integer format: ${value}`);
    }
    return parsedValue;
  }

  throw new Error(`Invalid input type for integer: ${typeof value}`);
}