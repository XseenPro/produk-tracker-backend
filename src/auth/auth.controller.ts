import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { checkPassword, hashing } from "../utils/hashing";
import { createUser, findUserByEmail, getUsersByRole, updateUserService, getUserSummaryService, getUserDetailService } from "./auth.service";
import { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import fs from "fs";

const prisma = new PrismaClient();

export const registerUser = async (req: Request, res: Response) => {
  const user = req.body;
  const createdByUser = res.locals.user || null;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingUser) {
      return res.status(422).json({
        status: false,
        statusCode: 422,
        message: `Email "${user.email}" is already taken. Please use a different email.`,
      });
    }

    user.password = hashing(user.password);
    user.tier = user.tier || "bronze";

    const newUser = await createUser(user, createdByUser);

    return res.status(201).json({
      status: true,
      statusCode: 201,
      message: "User created successfully",
      data: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(422).send({ status: false, statusCode: 422, message: "An unknown error occurred." });
    }
  }
};

export const createSession = async (req: Request, res: Response) => {
  const userLogin = req.body;
  try {
    const user = await findUserByEmail(userLogin.email);
    if (user === null) {
      return res.status(404).send({ status: false, statusCode: 422, message: "Invalid Email" });
    }
    const isValid = checkPassword(userLogin.password, user.password);
    if (!isValid) return res.status(401).json({ status: false, statusCode: 401, message: "Invalid Password" });

    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
      return res.status(500).json({ error: "JWT secret is not defined" });
    }
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
      },
      secretKey,
      { expiresIn: "1d" }
    );

    logger.info("Login Success");
    return res.status(200).send({
      status: true,
      statusCode: 200,
      message: "Login success",
      data: { accessToken, user: { id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, address: user.address, telp: user.telp } },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`ERR: auth - create session = ${error.message}`);
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      logger.error(`ERR: auth - create session = ${error}`);
      return res.status(422).send({ status: false, statusCode: 422, message: error });
    }
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).send({ status: false, message: "No token provided." });
  }

  try {
    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (isBlacklisted) {
      return res.status(400).send({
        status: false,
        message: "Token is already blacklisted.",
      });
    }

    await prisma.blacklistedToken.create({
      data: { token },
    });

    return res.status(200).send({
      status: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: "Failed to log out token." });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const user = res.locals.user;

  if (!user || !user.id) {
    return res.status(403).json({
      status: false,
      message: "Unauthorized: User not found in session",
    });
  }

  try {
    const users = await getUsersByRole(user);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(422).send({ status: false, statusCode: 422, message: "An unknown error occurred." });
    }
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = res.locals.user.id;
  const { username, address, telp } = req.body;
  const logoFile = req.file;

  let logoBuffer: Buffer | undefined = undefined;

  if (logoFile) {
    logoBuffer = logoFile.buffer;
  }

  if (!username && !address && !telp && !logoBuffer) {
    return res.status(400).json({
      status: false,
      statusCode: 400,
      message: "At least one of username, address, telp, or logo must be provided.",
    });
  }

  try {
    const updatedUser = await updateUserService(userId, {
      username,
      address,
      telp,
      logo: logoBuffer,
    });

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "User data updated successfully",
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        address: updatedUser.address,
        telp: updatedUser.telp,
        logo: updatedUser.logo?.toString("base64"), // kirim base64 ke client
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(422).send({ status: false, statusCode: 422, message: errMsg });
  }
};

export const getUserSummary = async (req: Request, res: Response) => {
  try {
    const summary = await getUserSummaryService();

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "User summary retrieved successfully",
      data: summary,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(422).send({ status: false, statusCode: 422, message: "An unknown error occurred." });
    }
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = res.locals.user;

  if (!user || !user.id) {
    return res.status(403).json({
      status: false,
      message: "Unauthorized: User not found in session",
    });
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        tier: true,
        address: true,
        telp: true,
        logo: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let logoBase64: string | null = null;
    if (currentUser.logo) {
      const base64String = Buffer.from(currentUser.logo).toString("base64");
      const mimeType = "image/jpeg"; // Sesuaikan kalau di DB bisa PNG
      logoBase64 = `data:${mimeType};base64,${base64String}`;
    }

    return res.status(200).json({
      status: true,
      statusCode: 200,
      message: "User details retrieved successfully",
      data: {
        ...currentUser,
        logo: logoBase64,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(422).send({ status: false, statusCode: 422, message: error.message });
    } else {
      return res.status(422).send({ status: false, statusCode: 422, message: "An unknown error occurred." });
    }
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const requestingUser = res.locals.user;
    const targetUserId = req.params.id;

    if (!requestingUser || !requestingUser.id) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const userDetails = await getUserDetailService(requestingUser, targetUserId);

    return res.status(200).json({
      status: true,
      statusCode: 200,
      data: userDetails,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(403).json({
        status: false,
        statusCode: 403,
        message: error.message,
      });
    }
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
