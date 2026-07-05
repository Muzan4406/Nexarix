import app from "./app";
import { logger } from "./lib/logger";
import { autoSetupWebhook } from "./routes/telegram";
import { runStartupMigrations } from "./lib/migrate";

const port = Number(process.env["PORT"] ?? "8080");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

// Run migrations then start server
runStartupMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Register Telegram webhook
    autoSetupWebhook().catch(() => {});
  });
}).catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
