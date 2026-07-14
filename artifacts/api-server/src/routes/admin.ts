import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { usersTable, tasksTable, withdrawalsTable, siteSettingsTable, taskCompletionsTable, adminOtpSessionsTable, blockedIpsTable } from "@workspace/db";
import { eq, or, ilike, sql, inArray, lt, desc } from "drizzle-orm";
import { signToken, authMiddleware, adminMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";
import { adminLoginLimiter, otpLimiter, alertIntrusion, withdrawalConfirmLimiter, blockIp } from "../lib/security";

const router = Router();

// Credentials loaded from environment — NEVER hardcode in source code
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.warn("[security] ADMIN_EMAIL / ADMIN_PASSWORD non définis en variable d'environnement !");
}

// Code secret requis pour confirmer un retrait avant déclenchement du payout auto
const WITHDRAWAL_CONFIRMATION_CODE = process.env.WITHDRAWAL_CONFIRMATION_CODE ?? "";

if (!WITHDRAWAL_CONFIRMATION_CODE) {
  console.warn("[security] WITHDRAWAL_CONFIRMATION_CODE non défini — la confirmation de retrait sera refusée !");
}

// Clean up expired OTP sessions every 10 minutes
setInterval(async () => {
  try {
    await db.delete(adminOtpSessionsTable).where(lt(adminOtpSessionsTable.expiresAt, Date.now()));
  } catch (_) {}
}, 10 * 60 * 1000);

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const MASKED_SECRET_PREFIX = "••••";

// Never send a stored API key / webhook secret back to the browser in full —
// only a short suffix so the admin can recognize it without exposing it.
function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  return MASKED_SECRET_PREFIX + value.slice(-4);
}

// Detect when the settings form just echoes back the masked placeholder
// instead of a real new value, so we don't overwrite the stored secret with it.
function isMaskedSecret(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(MASKED_SECRET_PREFIX);
}

router.post("/admin/login", adminLoginLimiter, async (req, res) => {
  const { identifier, password } = req.body;

  let userId: number;
  let isAdminUser: boolean;
  let username: string;

  const isAdminIdentifier = identifier === ADMIN_EMAIL || identifier === ADMIN_USERNAME;
  const isAdminPassword = password === ADMIN_PASSWORD;

  if (!identifier || !password) {
    res.status(400).json({ error: "Identifiant et mot de passe requis" });
    return;
  }

  if (isAdminIdentifier && isAdminPassword) {
    // Super admin hardcoded login
    let [adminUser] = await db.select().from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL)).limit(1);

    if (!adminUser) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      [adminUser] = await db.insert(usersTable).values({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        phone: "0000000000",
        country: "Togo",
        passwordHash,
        status: "active",
        membership: "Premium",
        isAdmin: true,
      }).returning();
    }

    userId = adminUser.id;
    isAdminUser = true;
    username = adminUser.username;
  } else {
    // DB admin login
    const [adminUser] = await db.select().from(usersTable)
      .where(or(eq(usersTable.email, identifier), eq(usersTable.username, identifier)))
      .limit(1);

    if (!adminUser || !adminUser.isAdmin) {
      await alertIntrusion(
        "TENTATIVE CONNEXION ADMIN INVALIDE",
        `👤 Identifiant: <code>${String(identifier).slice(0, 40)}</code>\n❌ Compte inexistant ou non-admin`,
        req
      );
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!valid) {
      await alertIntrusion(
        "TENTATIVE CONNEXION ADMIN — MOT DE PASSE INCORRECT",
        `👤 Identifiant: <code>${String(identifier).slice(0, 40)}</code>`,
        req
      );
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    userId = adminUser.id;
    isAdminUser = true;
    username = adminUser.username;
  }

  // Generate OTP and persist to DB
  const otp = generateOtp();
  const sessionToken = randomUUID();
  await db.insert(adminOtpSessionsTable).values({
    sessionToken,
    otp,
    userId,
    isAdmin: 1,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  await sendTelegramNotification(
    `🔐 <b>Tentative de connexion Admin</b>\n` +
    `👤 Admin: <b>${username}</b>\n` +
    `🔢 Code OTP: <b>${otp}</b>\n` +
    `⏱️ Valide 5 minutes\n` +
    `⚠️ Si ce n'est pas vous, ignorez ce message.`
  );

  res.json({ otpRequired: true, sessionToken });
});

router.post("/admin/verify-otp", otpLimiter, async (req, res) => {
  const { sessionToken, otp } = req.body;

  if (!sessionToken || !otp) {
    res.status(400).json({ error: "Session token et OTP requis" });
    return;
  }

  const [session] = await db
    .select()
    .from(adminOtpSessionsTable)
    .where(eq(adminOtpSessionsTable.sessionToken, sessionToken))
    .limit(1);

  if (!session) {
    res.status(401).json({ error: "Session invalide ou expirée" });
    return;
  }

  if (Date.now() > session.expiresAt) {
    await db.delete(adminOtpSessionsTable).where(eq(adminOtpSessionsTable.sessionToken, sessionToken));
    res.status(401).json({ error: "Code OTP expiré — veuillez vous reconnecter" });
    return;
  }

  if (session.otp !== otp.trim()) {
    res.status(401).json({ error: "Code OTP incorrect" });
    return;
  }

  await db.delete(adminOtpSessionsTable).where(eq(adminOtpSessionsTable.sessionToken, sessionToken));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }

  const token = signToken({ userId: user.id, isAdmin: true });

  sendTelegramNotification(
    `✅ <b>Connexion admin réussie</b>\n` +
    `👤 Admin: <b>${user.username}</b>\n` +
    `📅 ${new Date().toLocaleString("fr-FR", { timeZone: "UTC" })}`
  );

  res.json({ token, user: formatUser(user) });
});

router.get("/admin/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.isAdmin, false));
  const activeUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(sql`${usersTable.status} = 'active' AND ${usersTable.isAdmin} = false`);
  const inactiveUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(sql`${usersTable.status} = 'inactive' AND ${usersTable.isAdmin} = false`);

  const pointsData = await db.select({
    totalPoints: sql<number>`sum(${usersTable.points})`,
  }).from(usersTable);

  const pendingWithdrawals = await db.select({
    total: sql<number>`sum(${withdrawalsTable.amountGross})`,
  }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));

  const paidWithdrawals = await db.select({
    total: sql<number>`sum(${withdrawalsTable.amountNet})`,
  }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "paid"));

  const activationFees = Number(activeUsers[0].count) * 3000;

  const recentRegistrations = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(sql`${usersTable.joinedAt} > now() - interval '7 days' AND ${usersTable.isAdmin} = false`);

  res.json({
    totalUsers: Number(totalUsers[0].count),
    activeUsers: Number(activeUsers[0].count),
    inactiveUsers: Number(inactiveUsers[0].count),
    totalActivationFees: activationFees,
    totalPointsGenerated: Number(pointsData[0]?.totalPoints || 0),
    totalPointsConverted: 0,
    pendingWithdrawals: Number(pendingWithdrawals[0]?.total || 0),
    paidWithdrawals: Number(paidWithdrawals[0]?.total || 0),
    recentRegistrations: Number(recentRegistrations[0].count),
  });
});

router.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  const { search, status } = req.query as { search?: string; status?: string };

  const users = await db.select().from(usersTable)
    .where(eq(usersTable.isAdmin, false));

  let filtered = users;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(u =>
      u.username.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.includes(s)
    );
  }
  if (status) {
    filtered = filtered.filter(u => u.status === status);
  }

  const result = await Promise.all(filtered.map(async user => {
    const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(eq(usersTable.upline, user.username));
    return { ...formatAdminUser(user), totalDownlines: Number(dl.count) };
  }));

  res.json(result);
});

router.get("/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.upline, user.username));
  res.json({ ...formatAdminUser(user), totalDownlines: Number(dl.count) });
});

router.patch("/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const { balance, points, status, upline, password, isBanned } = req.body;

  const updates: any = {};
  if (balance !== undefined) updates.balance = balance.toString();
  if (points !== undefined) updates.points = points;
  if (status !== undefined) updates.status = status;
  if (upline !== undefined) updates.upline = upline;
  if (isBanned !== undefined) updates.isBanned = isBanned;
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  if (status === "active") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user && user.status !== "active") {
      updates.membership = "Premium";
      updates.balance = sql`${usersTable.balance} + 50`;
      updates.welcomeBonus = sql`${usersTable.welcomeBonus} + 50`;
      await distributeMLMCommissions(user);
      await sendTelegramNotification(
        `💰 <b>Activation manuelle (Admin)</b>\n` +
        `👤 Utilisateur: <b>${user.username}</b>\n` +
        `📧 Email: ${user.email}\n` +
        `📱 Téléphone: ${user.phone || "—"}\n` +
        `🌍 Pays: ${user.country || "—"}\n` +
        `✅ Compte activé manuellement`
      );
    }
  }

  if (isBanned === true) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      sendTelegramNotification(
        `⛔ <b>Utilisateur banni (Admin)</b>\n` +
        `👤 Username: <b>${user.username}</b>\n` +
        `📧 Email: ${user.email}`
      );
    }
  }

  const [updated] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.upline, updated.username));
  res.json({ ...formatAdminUser(updated), totalDownlines: Number(dl.count) });
});

// Set admin role — only super admin can do this
router.post("/admin/users/:userId/set-admin", authMiddleware, adminMiddleware, async (req, res) => {
  const requestingUserId = (req as any).userId;
  const [requestingUser] = await db.select().from(usersTable).where(eq(usersTable.id, requestingUserId)).limit(1);

  const isSuperAdmin = requestingUser?.email === ADMIN_EMAIL || requestingUser?.username === ADMIN_USERNAME;
  if (!isSuperAdmin) {
    res.status(403).json({ error: "Seul le super-admin peut nommer des administrateurs" });
    return;
  }

  const userId = parseInt(req.params.userId as string);
  const { isAdmin } = req.body;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ isAdmin: !!isAdmin })
    .where(eq(usersTable.id, userId))
    .returning();

  sendTelegramNotification(
    isAdmin
      ? `🛡️ <b>Nouveau admin nommé</b>\n👤 ${user.username} (${user.email}) est maintenant administrateur.`
      : `🔴 <b>Admin révoqué</b>\n👤 ${user.username} n'est plus administrateur.`
  );

  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.upline, updated.username));
  res.json({ ...formatAdminUser(updated), totalDownlines: Number(dl.count) });
});

async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;

  const commissions = [
    { level: 1, amount: 1300 },
    { level: 2, amount: 700 },
    { level: 3, amount: 400 },
  ];

  let currentUplineUsername = user.upline;
  for (const { level, amount } of commissions) {
    if (!currentUplineUsername) break;
    const [uplineUser] = await db.select().from(usersTable)
      .where(eq(usersTable.username, currentUplineUsername)).limit(1);
    if (!uplineUser) break;

    const mlmField = level === 1 ? usersTable.mlmEarningsL1
      : level === 2 ? usersTable.mlmEarningsL2
      : usersTable.mlmEarningsL3;

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${amount}`,
      [level === 1 ? "mlmEarningsL1" : level === 2 ? "mlmEarningsL2" : "mlmEarningsL3"]: sql`${mlmField} + ${amount}`,
    }).where(eq(usersTable.id, uplineUser.id));

    currentUplineUsername = uplineUser.upline;
  }
}

router.delete("/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.status === "active" && user.upline) {
    const commissions = [
      { field: "mlmEarningsL1" as const, amount: 1300 },
      { field: "mlmEarningsL2" as const, amount: 700 },
      { field: "mlmEarningsL3" as const, amount: 400 },
    ];
    let currentUpline: string | null = user.upline;
    for (const { field, amount } of commissions) {
      if (!currentUpline) break;
      const [uplineUser] = await db.select().from(usersTable).where(eq(usersTable.username, currentUpline)).limit(1);
      if (!uplineUser) break;
      const mlmField = field === "mlmEarningsL1" ? usersTable.mlmEarningsL1 : field === "mlmEarningsL2" ? usersTable.mlmEarningsL2 : usersTable.mlmEarningsL3;
      await db.update(usersTable).set({
        balance: sql`GREATEST(${usersTable.balance}::numeric - ${amount}, 0)`,
        [field]: sql`GREATEST(${mlmField}::numeric - ${amount}, 0)`,
      }).where(eq(usersTable.id, uplineUser.id));
      currentUpline = uplineUser.upline ?? null;
    }
  }

  sendTelegramNotification(
    `🗑️ <b>Utilisateur supprimé (Admin)</b>\n` +
    `👤 Username: <b>${user.username}</b>\n` +
    `📧 Email: ${user.email}`
  );

  await db.update(usersTable).set({ upline: null }).where(eq(usersTable.upline, user.username));
  await db.delete(taskCompletionsTable).where(eq(taskCompletionsTable.userId, userId));
  await db.delete(withdrawalsTable).where(eq(withdrawalsTable.userId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.post("/admin/users/:userId/revoke-referral", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!user.upline) { res.status(400).json({ error: "Cet utilisateur n'a pas de parrain" }); return; }

  if (user.status === "active") {
    const commissions = [
      { field: "mlmEarningsL1" as const, amount: 1300 },
      { field: "mlmEarningsL2" as const, amount: 700 },
      { field: "mlmEarningsL3" as const, amount: 400 },
    ];
    let currentUpline: string | null = user.upline;
    for (const { field, amount } of commissions) {
      if (!currentUpline) break;
      const [uplineUser] = await db.select().from(usersTable).where(eq(usersTable.username, currentUpline)).limit(1);
      if (!uplineUser) break;
      const mlmField = field === "mlmEarningsL1" ? usersTable.mlmEarningsL1 : field === "mlmEarningsL2" ? usersTable.mlmEarningsL2 : usersTable.mlmEarningsL3;
      await db.update(usersTable).set({
        balance: sql`GREATEST(${usersTable.balance}::numeric - ${amount}, 0)`,
        [field]: sql`GREATEST(${mlmField}::numeric - ${amount}, 0)`,
      }).where(eq(usersTable.id, uplineUser.id));
      currentUpline = uplineUser.upline ?? null;
    }
  }

  const [updated] = await db.update(usersTable).set({ upline: null }).where(eq(usersTable.id, userId)).returning();
  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.upline, updated.username));
  res.json({ ...formatAdminUser(updated), totalDownlines: Number(dl.count) });
});

router.get("/admin/tasks", authMiddleware, adminMiddleware, async (req, res) => {
  const tasks = await db.select().from(tasksTable)
    .where(sql`${tasksTable.deletedAt} IS NULL`)
    .orderBy(sql`${tasksTable.createdAt} DESC`);
  res.json(tasks.map(formatTask));
});

router.post("/admin/tasks", authMiddleware, adminMiddleware, async (req, res) => {
  const { category, description, targetUrl, points, isActive } = req.body;

  if (!category || !targetUrl || !points) {
    res.status(400).json({ error: "category, targetUrl and points are required" });
    return;
  }

  const autoTitle = description ? description.substring(0, 60) : category;

  const [task] = await db.insert(tasksTable).values({
    category,
    title: autoTitle,
    description: description || null,
    targetUrl,
    points,
    isActive: isActive ?? true,
    question: null,
    correctAnswer: null,
  }).returning();

  sendTelegramNotification(
    `📋 <b>Tâche créée (Admin)</b>\n` +
    `📌 Catégorie: ${category}\n` +
    `🎯 Points: ${points}`
  );

  res.status(201).json(formatTask(task));
});

router.patch("/admin/tasks/:taskId", authMiddleware, adminMiddleware, async (req, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const updates: any = {};
  const fields = ["category", "title", "description", "targetUrl", "points", "isActive", "question", "correctAnswer"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, taskId)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task));
});

router.delete("/admin/tasks/:taskId", authMiddleware, adminMiddleware, async (req, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const [task] = await db.update(tasksTable)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(tasksTable.id, taskId))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  sendTelegramNotification(`🗑️ <b>Tâche supprimée (Admin)</b>\n📌 ID: ${taskId}`);
  res.json({ success: true });
});

router.get("/admin/withdrawals", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.query as { status?: string };

  const withdrawals = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  let result = withdrawals;
  if (status) {
    result = result.filter(r => r.withdrawal.status === status);
  }

  res.json(result.map(r => ({
    id: r.withdrawal.id,
    userId: r.withdrawal.userId,
    username: r.username,
    type: r.withdrawal.type,
    operator: r.withdrawal.operator,
    phone: r.withdrawal.phone,
    amountGross: parseFloat(r.withdrawal.amountGross || "0"),
    fee: parseFloat(r.withdrawal.fee || "0"),
    amountNet: parseFloat(r.withdrawal.amountNet || "0"),
    status: r.withdrawal.status,
    rejectionReason: r.withdrawal.rejectionReason,
    createdAt: r.withdrawal.createdAt?.toISOString(),
  })));
});

const SENDAVAPAY_BASE = "https://sendavapay.com/api/sdk/v1";

const COUNTRY_ISO: Record<string, string> = {
  "Togo": "TG", "Bénin": "BJ", "Côte d'Ivoire": "CI",
  "Cameroun": "CM", "Burkina Faso": "BF", "Mali": "ML",
  "Niger": "NE", "Sénégal": "SN", "Guinée": "GN",
  "Gabon": "GA", "Tchad": "TD", "Congo": "COG",
  "République centrafricaine": "CF", "Guinée Équatoriale": "GQ", "RD Congo": "COD",
};

const CURRENCY_BY_ISO: Record<string, string> = {
  "TG": "XOF", "BJ": "XOF", "CI": "XOF", "ML": "XOF",
  "BF": "XOF", "NE": "XOF", "SN": "XOF", "GN": "GNF",
  "CM": "XAF", "COG": "XAF", "CF": "XAF", "GQ": "XAF", "GA": "XAF", "TD": "XAF",
  "COD": "CDF",
};

function getOperatorSlug(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tmoney")) return "tmoney";
  if (n.includes("moov") || n.includes("flooz")) return "moov";
  if (n.includes("mtn")) return "mtn";
  if (n.includes("orange")) return "orange";
  if (n.includes("wave")) return "wave";
  if (n.includes("airtel")) return "airtel";
  if (n.includes("free")) return "freemoney";
  if (n.includes("cellcom")) return "cellcom";
  if (n.includes("wizall")) return "wizall";
  return n.replace(/\s+/g, "");
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (!cleaned.startsWith("+")) return "+" + cleaned;
  return cleaned;
}

router.patch("/admin/withdrawals/:withdrawalId/approve", authMiddleware, adminMiddleware, withdrawalConfirmLimiter, async (req, res) => {
  const withdrawalId = parseInt(req.params.withdrawalId as string);
  const { confirmationCode } = req.body;

  if (!WITHDRAWAL_CONFIRMATION_CODE) {
    res.status(500).json({ error: "Code de confirmation non configuré côté serveur. Contactez l'administrateur système." });
    return;
  }

  if (!confirmationCode || confirmationCode !== WITHDRAWAL_CONFIRMATION_CODE) {
    await alertIntrusion(
      "CODE DE CONFIRMATION RETRAIT INCORRECT",
      `⚠️ Tentative de validation du retrait #${withdrawalId} avec un code invalide`,
      req
    );
    res.status(401).json({ error: "Code de confirmation invalide." });
    return;
  }

  const [withdrawal] = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.id, withdrawalId))
    .limit(1);

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const w = withdrawal.withdrawal;

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const isAutoMode = settings?.paymentMode === "auto" && !!settings?.sendavapayApiKey;

  let sendavapayRef: string | null = null;
  let sendavapayStatus: string | null = null;
  let payoutError: string | null = null;

  if (isAutoMode) {
    const countryIso = COUNTRY_ISO[w.country || ""] || "TG";
    const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
    const operatorSlug = getOperatorSlug(w.operator);
    const phone = normalizePhone(w.phone);
    const amountNet = parseFloat(w.amountNet || "0");

    try {
      const resp = await fetch(`${SENDAVAPAY_BASE}/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings!.sendavapayApiKey}`,
        },
        body: JSON.stringify({
          amount: amountNet,
          phoneNumber: phone,
          operator: operatorSlug,
          country: countryIso,
          currency,
          description: `Retrait Nexarix #${withdrawalId}`,
          externalReference: `nexarix-withdrawal-${withdrawalId}`,
        }),
      });
      const json = await resp.json() as any;
      if (json.success) {
        sendavapayRef = json.data.reference;
        sendavapayStatus = json.data.status;
      } else {
        payoutError = json.error || json.code || "Erreur Sendavapay";
      }
    } catch (e: any) {
      payoutError = e.message;
    }
  }

  // Si le payout auto a échoué (ex: solde Sendavapay insuffisant), on NE marque PAS
  // le retrait comme "paid" — il reste "pending" pour permettre une nouvelle tentative
  // (ex: après rechargement du solde Sendavapay) sans perdre la trace de l'argent.
  const payoutFailed = isAutoMode && !!payoutError;

  const [updated] = await db.update(withdrawalsTable)
    .set(
      payoutFailed
        ? { sendavapayStatus: "failed" }
        : { status: "paid", sendavapayReference: sendavapayRef, sendavapayStatus: sendavapayStatus }
    )
    .where(eq(withdrawalsTable.id, withdrawalId))
    .returning();

  if (isAutoMode && sendavapayRef) {
    sendTelegramNotification(
      `✅ <b>Retrait approuvé + payout envoyé</b>\n` +
      `👤 Utilisateur: <b>${withdrawal.username}</b>\n` +
      `💰 Montant net: <b>${parseFloat(updated.amountNet || "0").toLocaleString()} FCFA</b>\n` +
      `🏦 ${updated.operator} — ${updated.phone}\n` +
      `🔖 Réf Sendavapay: <code>${sendavapayRef}</code>`
    );
  } else if (isAutoMode && payoutError) {
    sendTelegramNotification(
      `⚠️ <b>Retrait approuvé — payout ÉCHOUÉ</b>\n` +
      `👤 Utilisateur: <b>${withdrawal.username}</b>\n` +
      `💰 Montant net: <b>${parseFloat(updated.amountNet || "0").toLocaleString()} FCFA</b>\n` +
      `🏦 ${updated.operator} — ${updated.phone}\n` +
      `❌ Erreur: ${payoutError}`
    );
  } else {
    sendTelegramNotification(
      `✅ <b>Retrait approuvé (manuel)</b>\n` +
      `👤 Utilisateur: <b>${withdrawal.username}</b>\n` +
      `💰 Montant net: <b>${parseFloat(updated.amountNet || "0").toLocaleString()} FCFA</b>\n` +
      `🏦 Opérateur: ${updated.operator} — ${updated.phone}`
    );
  }

  res.json({
    ...formatAdminWithdrawal(updated),
    username: withdrawal.username,
    userId: updated.userId,
    payoutError: payoutError || undefined,
  });
});

router.patch("/admin/withdrawals/:withdrawalId/reject", authMiddleware, adminMiddleware, async (req, res) => {
  const withdrawalId = parseInt(req.params.withdrawalId as string);
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }

  const [withUser] = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
    userId: usersTable.id,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.id, withdrawalId))
    .limit(1);

  if (!withUser) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${withUser.withdrawal.amountGross}`,
    totalWithdrawn: sql`${usersTable.totalWithdrawn} - ${withUser.withdrawal.amountNet}`,
  }).where(eq(usersTable.id, withUser.userId));

  const [updated] = await db.update(withdrawalsTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(withdrawalsTable.id, withdrawalId))
    .returning();

  sendTelegramNotification(
    `❌ <b>Retrait rejeté</b>\n` +
    `👤 Utilisateur: <b>${withUser.username}</b>\n` +
    `💰 Montant: <b>${parseFloat(updated.amountGross || "0").toLocaleString()} FCFA</b>\n` +
    `📝 Raison: ${reason}`
  );

  res.json({
    ...formatAdminWithdrawal(updated),
    username: withUser.username,
    userId: updated.userId,
  });
});

router.get("/admin/settings", authMiddleware, adminMiddleware, async (req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({}).returning();
  }
  res.json({
    ...settings,
    activationFee: parseFloat(settings.activationFee || "3000"),
    minWithdrawal: parseFloat(settings.minWithdrawal || "3000"),
    sendavapayApiKey: maskSecret(settings.sendavapayApiKey),
    sendavapayWebhookSecret: maskSecret(settings.sendavapayWebhookSecret),
  });
});

router.patch("/admin/settings", authMiddleware, adminMiddleware, async (req, res) => {
  const { supportEmail, telegramLink, telegramChannel, whatsappLink, vcfLink, activationFee, minWithdrawal, paymentMode, sendavapayApiKey, sendavapayWebhookSecret, appBaseUrl, maintenanceMode } = req.body;

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  const updates: any = {};
  if (supportEmail !== undefined) updates.supportEmail = supportEmail;
  if (telegramLink !== undefined) updates.telegramLink = telegramLink;
  if (telegramChannel !== undefined) updates.telegramChannel = telegramChannel;
  if (whatsappLink !== undefined) updates.whatsappLink = whatsappLink;
  if (vcfLink !== undefined) updates.vcfLink = vcfLink;
  if (activationFee !== undefined) updates.activationFee = activationFee.toString();
  if (minWithdrawal !== undefined) updates.minWithdrawal = minWithdrawal.toString();
  if (paymentMode !== undefined) updates.paymentMode = paymentMode;
  // Ignore masked placeholders coming back from the settings form (the client
  // only re-sends these if the admin actually typed a new value).
  if (sendavapayApiKey !== undefined && !isMaskedSecret(sendavapayApiKey)) updates.sendavapayApiKey = sendavapayApiKey;
  if (sendavapayWebhookSecret !== undefined && !isMaskedSecret(sendavapayWebhookSecret)) updates.sendavapayWebhookSecret = sendavapayWebhookSecret;
  if (appBaseUrl !== undefined) updates.appBaseUrl = appBaseUrl;
  if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;

  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values(updates).returning();
  } else {
    [settings] = await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, settings.id)).returning();
  }

  sendTelegramNotification(`⚙️ <b>Paramètres mis à jour (Admin)</b>`);

  res.json({
    ...settings,
    activationFee: parseFloat(settings.activationFee || "3000"),
    minWithdrawal: parseFloat(settings.minWithdrawal || "3000"),
  });
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

function formatAdminUser(user: any) {
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
    joinedAt: user.joinedAt?.toISOString(),
    isBanned: user.isBanned ?? false,
    totalDownlines: 0,
  };
}

function formatTask(task: any) {
  return {
    id: task.id,
    category: task.category,
    title: task.title,
    description: task.description,
    targetUrl: task.targetUrl,
    points: task.points,
    isActive: task.isActive,
    question: task.question,
    correctAnswer: task.correctAnswer,
    completedAt: null,
    createdAt: task.createdAt?.toISOString(),
  };
}

function formatAdminWithdrawal(w: any) {
  return {
    id: w.id,
    type: w.type,
    operator: w.operator,
    phone: w.phone,
    country: w.country,
    amountGross: parseFloat(w.amountGross || "0"),
    fee: parseFloat(w.fee || "0"),
    amountNet: parseFloat(w.amountNet || "0"),
    status: w.status,
    sendavapayReference: w.sendavapayReference,
    sendavapayStatus: w.sendavapayStatus,
    rejectionReason: w.rejectionReason,
    createdAt: w.createdAt?.toISOString(),
  };
}

// ─── Gestion des IP bloquées ─────────────────────────────────────────────────

router.get("/admin/blocked-ips", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(blockedIpsTable)
      .orderBy(desc(blockedIpsTable.blockedAt));
    res.json(
      rows.map((r) => ({
        id: r.id,
        ip: r.ip,
        reason: r.reason,
        blockedAt: new Date(r.blockedAt).toISOString(),
      }))
    );
  } catch (err) {
    console.error("Erreur récupération IP bloquées:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/admin/blocked-ips", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { ip, reason } = req.body ?? {};
    if (!ip || typeof ip !== "string") {
      res.status(400).json({ error: "Adresse IP requise" });
      return;
    }
    await blockIp(ip.trim(), (typeof reason === "string" && reason.trim()) || "Blocage manuel par l'administrateur");
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur blocage IP:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/admin/blocked-ips/:ip", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ip = decodeURIComponent(String(req.params.ip));
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.ip, ip));
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur déblocage IP:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
