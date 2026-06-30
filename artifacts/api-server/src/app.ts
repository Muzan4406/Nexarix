import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.use("/api/activate/webhook", express.raw({ type: "application/json" }));
app.use("/api/formations/purchase/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// JSON error handler — must be last
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Erreur interne du serveur";
  res.status(status).json({ error: message });
});

export default app;
