import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { usersTable, adminOtpSessionsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/auth";
import { sendTelegramNotification, escapeHtml } from "../lib/telegram";
import { loginLimiter, registerLimiter, otpLimiter, trackFailedLogin, resetFailedLogin, alertIntrusion } from "../lib/security";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const router = Router();

router.post("/auth/register", registerLimiter, async (req, res, next) => {
  try {
    const { username, email, phone, country, password, upline } = req.body;

    if (!username || !email || !phone || !country || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (/\s/.test(username)) {
      res.status(400).json({ error: "Username cannot contain spaces" });
      return;
    }

    const existing = await db.select().from(usersTable).where(
      or(eq(usersTable.username, username), eq(usersTable.email, email))
    ).limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Username or email already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      username,
      email,
      phone,
      country,
      passwordHash,
      upline: upline || null,
      status: "inactive",
      membership: "Free",
    }).returning();

    const token = signToken({ userId: user.id, isAdmin: false });

    sendTelegramNotification(
      `🆕 <b>Nouveau membre inscrit</b>\n` +
      `👤 Username: <b>${escapeHtml(username)}</b>\n` +
      `📧 Email: ${escapeHtml(email)}\n` +
      `📱 Téléphone: ${escapeHtml(phone)}\n` +
      `🌍 Pays: ${escapeHtml(country)}\n` +
      `🔗 Parrain: ${escapeHtml(upline || "Aucun")}`
    );

    res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: "Identifier and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(
      or(eq(usersTable.username, identifier), eq(usersTable.email, identifier))
    ).limit(1);

    if (!user) {
      trackFailedLogin(req, identifier);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      trackFailedLogin(req, identifier);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.isBanned) {
      await alertIntrusion("CONNEXION COMPTE BANNI", `👤 Identifiant: <code>${escapeHtml(identifier.slice(0, 40))}</code>`, req);
      res.status(403).json({ error: "Account is banned" });
      return;
    }

    resetFailedLogin(req);

    // Admin users require OTP verification
    if (user.isAdmin) {
      const otp = generateOtp();
      const sessionToken = randomUUID();
      await db.insert(adminOtpSessionsTable).values({
        sessionToken,
        otp,
        userId: user.id,
        isAdmin: 1,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      await sendTelegramNotification(
        `🔐 <b>Connexion Admin</b>\n` +
        `👤 Admin: <b>${escapeHtml(user.username)}</b>\n` +
        `🔢 Code OTP: <b>${otp}</b>\n` +
        `⏱️ Valide 5 minutes`
      );

      res.json({ otpRequired: true, sessionToken });
      return;
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
});

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    status: user.status,
    membership: user.membership,
    balance: parseFloat(user.balance || "0"),
    points: user.points,
    upline: user.upline,
    avatarUrl: user.avatarUrl,
    joinedAt: user.joinedAt?.toISOString(),
    isAdmin: user.isAdmin,
  };
}

export default router;
