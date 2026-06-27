import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, authMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();

router.post("/auth/register", async (req, res) => {
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
    `👤 Username: <b>${username}</b>\n` +
    `📧 Email: ${email}\n` +
    `📱 Téléphone: ${phone}\n` +
    `🌍 Pays: ${country}\n` +
    `🔗 Parrain: ${upline || "Aucun"}`
  );

  res.status(201).json({
    token,
    user: formatUser(user),
  });
});

router.post("/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: "Identifier and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(
    or(eq(usersTable.username, identifier), eq(usersTable.email, identifier))
  ).limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Account is banned" });
    return;
  }

  const token = signToken({ userId: user.id, isAdmin: user.isAdmin });

  res.json({
    token,
    user: formatUser(user),
  });
});

router.get("/auth/me", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
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
