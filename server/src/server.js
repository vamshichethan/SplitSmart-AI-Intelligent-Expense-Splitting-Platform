import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { initializePersistence } from "./services/persistence.js";
import { initializeQueues } from "./services/queue.js";
import { initializeRealtime } from "./services/realtime.js";

const port = Number(process.env.PORT ?? 4000);
await initializePersistence();
const queueStatus = await initializeQueues();
const app = createApp();
const server = createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

initializeRealtime(server, { allowedOrigins });

server.listen(port, () => {
  console.log(`SplitSmart AI API running on http://localhost:${port}`);
  console.log(`Queue mode: ${queueStatus.mode}`);
});
