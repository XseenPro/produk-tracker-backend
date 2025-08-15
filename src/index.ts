import express, { Application, Router } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import { logger } from "./utils/logger";
import { AuthRouter, Accounts } from "./auth/auth.route";
import { ProductRouter } from "./product/product.route";
import { DashboardRouter } from "./dashboard/dashboard.route";
import { TransactionRouter } from "./transaction/transaction.route";
import { ReportRouter } from "./report/report.route";
import { NotifRouter } from "./notifications/notif.route";
import deserializeToken from "./middlewares/deserializedToken";
import { PrismaClient } from "@prisma/client";
import { initSocket } from "./utils/socket";
import "./notifications/cronJob";

const app: Application = express();
const port: number = 4000;
const prisma = new PrismaClient();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  cors({
    origin: process.env.FE_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

const _routes: [string, Router][] = [
  ["/auth", AuthRouter],
  ["/accounts", Accounts],
  ["/product", ProductRouter],
  ["/dashboard", DashboardRouter],
  ["/transaksi", TransactionRouter],
  ["/report", ReportRouter],
  ["/notifications", NotifRouter],
];
_routes.forEach((route) => {
  const [url, router] = route;
  app.use(url, router);
});

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  logger.info(`Server is listening on port ${port}`);
});
