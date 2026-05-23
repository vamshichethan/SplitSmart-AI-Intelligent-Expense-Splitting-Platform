import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./modules/auth.js";
import { overviewRouter } from "./modules/overview.js";
import { persistenceMiddleware } from "./services/persistence.js";

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by CORS"));
      }
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(persistenceMiddleware);

  app.use("/api/auth", authRouter);
  app.use("/api", overviewRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}
