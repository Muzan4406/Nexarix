import app from "./app";
import { logger } from "./lib/logger";
import { autoSetupWebhook, loadBlockedIpsFromDb } from "./routes/telegram";
import net from "net";

const port = Number(process.env["PORT"] ?? "8080");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

function isPortInUse(p: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(true));
    tester.once("listening", () => {
      tester.close(() => resolve(false));
    });
    tester.listen(p, "0.0.0.0");
  });
}

const inUse = await isPortInUse(port);
if (inUse) {
  logger.info({ port }, "Port already in use — server already running, skipping start");
  process.exit(0);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Load persisted blocked IPs from DB into memory
  loadBlockedIpsFromDb().catch(() => {});

  // Register Telegram webhook with Replit public URL
  autoSetupWebhook().catch(() => {});
});
