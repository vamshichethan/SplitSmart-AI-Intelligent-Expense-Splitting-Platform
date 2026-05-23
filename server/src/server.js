import "dotenv/config";
import { createApp } from "./app.js";
import { initializePersistence } from "./services/persistence.js";

const port = Number(process.env.PORT ?? 4000);
await initializePersistence();
const app = createApp();

app.listen(port, () => {
  console.log(`SplitSmart AI API running on http://localhost:${port}`);
});
