import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db";
import jwt from "jsonwebtoken";
import { globalApiLimiter, blockedIpGuard } from "./lib/security";

const JWT_SECRET = process.env.JWT_SECRET ?? (
  process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET environment variable is required in production"); })()
    : "nexarix-dev-secret-change-in-production"
);

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

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // SPA gérée côté frontend
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS — restreint aux origines connues ───────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requêtes sans origine (curl, Postman, mobile natif) → autorisées en dev
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origine non autorisée ${origin}`), false);
  },
  credentials: true,
}));

// ─── Blocage IP permanent (avant tout le reste : coupe court aux IP bannies) ─
app.use("/api", blockedIpGuard);

// ─── Rate limiter global anti-bot/scan ───────────────────────────────────────
app.use("/api", globalApiLimiter);

// Raw body for webhook signature verification (must be before express.json)
app.use("/api/activate/webhook", express.raw({ type: "application/json" }));
app.use("/api/formations/purchase/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Maintenance mode middleware ────────────────────────────────────────────
// Blocks all API calls (except public settings + admin endpoints) when maintenance is on
app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  // Always allow: public settings, auth, admin routes
  const bypassed = [
    "/settings/public",
    "/auth/login",
    "/auth/register",
    "/admin",
  ];
  if (bypassed.some((p) => req.path.startsWith(p))) return next();

  try {
    const [settings] = await db.select({ maintenanceMode: siteSettingsTable.maintenanceMode }).from(siteSettingsTable).limit(1);
    if (!settings?.maintenanceMode) return next();

    // Check if request is from an admin
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        if (payload?.isAdmin) return next();
      } catch {
        // invalid token — fall through to maintenance response
      }
    }

    res.status(503).json({ error: "maintenance", message: "La plateforme est en maintenance. Revenez bientôt." });
  } catch {
    next();
  }
});

app.use("/api", router);

// Serve frontend static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// After esbuild, __dirname = dist/ and public/ is a sibling folder
const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));
// Express 5 wildcard — catch all non-API routes and serve the SPA
app.get("/{*splat}", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// JSON error handler — must be last
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  const status = err.status || err.statusCode || 500;

  // For 5xx errors, always return a generic message — never expose stack traces,
  // raw SQL, ORM internals, or database details to the client.
  // 4xx errors (set intentionally by route code) are surfaced as-is.
  const isServerError = status >= 500;
  const message =
    isServerError
      ? "Erreur interne du serveur"
      : err.message || "Erreur interne du serveur";

  res.status(status).json({ error: message });
});

export default app;
