import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET ?? (
  process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET environment variable is required in production"); })()
    : "nexarix-dev-secret-change-in-production"
);

export function signToken(payload: { userId: number; isAdmin: boolean }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number; isAdmin: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; isAdmin: boolean };
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as any).userId = payload.userId;
  (req as any).isAdmin = payload.isAdmin;
  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
