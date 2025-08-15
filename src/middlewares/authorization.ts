import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { logger } from "../utils/logger";
import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;
  if (!user) {
    return res.status(403).send({ status: false, statusCode: 403, message: "Forbidden" });
  }

  return next();
};

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return res.status(403).send({ status: false, statusCode: 403, message: "Access Denied" });
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    const fixedPabrikToken = process.env.FIXED_PABRIK_TOKEN;

    if (token === fixedPabrikToken) {

      const isBlacklisted = await prisma.blacklistedToken.findUnique({
        where: { token: fixedPabrikToken },
      });

      if (isBlacklisted) {
        return res.status(401).send({
          status: false,
          message: "Fixed token is no longer valid.",
        });
      }

      const pabrikAccountsCount = await prisma.user.count({
        where: { createdById: null, role: "pabrik" },
      });

      if (pabrikAccountsCount >= 2) {
        await prisma.blacklistedToken.create({
          data: { token: fixedPabrikToken },
        });

        return res.status(403).send({
          status: false,
          message: "Fixed token can only be used to create up to 2 pabrik accounts.",
        });
      }

      res.locals.user = { id: null, role: "pabrik" };
      return next();
    }

    const isBlacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (isBlacklisted) {
      return res.status(401).send({ status: false, message: "Token is blacklisted" });
    }

    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
      return res.status(500).send({ status: false, message: "JWT secret is not defined" });
    }

    const decoded = jwt.verify(token, secretKey) as { id: string; email: string; role: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).send({ status: false, statusCode: 404, message: "User not found" });
    }

    res.locals.user = user;

    next();
  } catch (error) {
    console.error("Token Verification Error:", error);
    if (error instanceof TokenExpiredError) {
      logger.error(`ERR: Token expired - ${error.message}`);
      return res.status(401).send({ status: false, message: "Access token has expired" });
    } else if (error instanceof Error) {
      logger.error(`ERR: ${error.message}`);
      return res.status(422).send({ status: false, message: error.message });
    } else {
      logger.error(`ERR: ${error}`);
      return res.status(422).send({ status: false, message: "An unknown error occurred." });
    }
  }
};



