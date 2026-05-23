import cors from "cors";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./modules/auth.js";
import { overviewRouter } from "./modules/overview.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api/auth", authRouter);
  app.use("/api", overviewRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
  });

  return app;
}
