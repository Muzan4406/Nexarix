import { Router } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();
const SENDAVAPAY_BASE = "https://sendavapay.com/api";
const WELCOME_BONUS = 50;
const REFERRAL_BONUS_AMOUNT = 1500;
const REFERRAL_BONUS_STEP = 10;

// ─── Public settings ─────────────────────────────────────────────────────────
router.get("/settings/public", async (_req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();
  res.json({
    activationFee: parseFloat(settings.activationFee || "3000"),
    paymentMode: settings.paymentMode || "manual",
  });
});

// ─── Initiate Sendavapay payment ──────────────────────────────────────────────
router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.status(400).json({ error: "Compte déjà activé" }); return; }

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();

  if (settings.paymentMode !== "auto") { res.status(400).json({ error: "Le paiement automatique n'est pas activé" }); return; }
  if (!settings.sendavapayApiKey) { res.status(503).json({ error: "La clé API Sendavapay n'est pas configurée" }); return; }

  const activationFee = parseFloat(settings.activationFee || "3000");
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;

  try {
    const response = await fetch(`${SENDAVAPAY_BASE}/v1/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.sendavapayApiKey}` },
      body: JSON.stringify({
        amount: activationFee,
        currency: "XOF",
        description: `Activation compte Nexarix — ${user.username}`,
        externalReference: `nexarix-activation-${user.id}`,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerName: user.username,
        redirectUrl: `${baseUrl}/payment-status`,
      }),
    });
    const json = await response.json() as any;
    if (!response.ok || !json.success) { res.status(502).json({ error: "Erreur Sendavapay", detail: json }); return; }
    res.json({ paymentUrl: json.data.paymentUrl, reference: json.data.reference });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter Sendavapay", detail: e.message });
  }
});

// ─── Check activation status ──────────────────────────────────────────────────
router.get("/activate/check", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { reference } = req.query as { reference?: string };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.json({ status: "active" }); return; }

  if (reference) {
    try {
      const [settings] = await db.select().from(siteSettingsTable).limit(1);
      if (settings?.sendavapayApiKey) {
        const resp = await fetch(`${SENDAVAPAY_BASE}/v1/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.sendavapayApiKey}` },
          body: JSON.stringify({ reference }),
        });
        const json = await resp.json() as any;
        if (json.success && json.data?.status === "completed" && user.status !== "active") {
          await activateUser(user);
          res.json({ status: "active" }); return;
        }
      }
    } catch (_) {}
  }
  res.json({ status: user.status });
});

// ─── Webhook ──────────────────────────────────────────────────────────────────
router.post("/activate/webhook", async (req, res) => {
  const signature = req.headers["x-sendavapay-signature"] as string | undefined;
  const event = req.headers["x-sendavapay-event"] as string | undefined;
  const [settings] = await db.select().from(siteSettingsTable).limit(1);

  if (settings?.sendavapayWebhookSecret && signature) {
    const expected = createHmac("sha256", settings.sendavapayWebhookSecret)
      .update(JSON.stringify(req.body)).digest("hex");
    if (expected !== signature) { res.status(401).json({ error: "Signature invalide" }); return; }
  }

  const { data } = req.body as { event?: string; data?: { reference?: string }; timestamp?: string };
  const eventType = event || req.body.event;

  if (eventType === "payment.completed") {
    const reference = data?.reference;
    if (!reference) { res.status(400).json({ error: "Reference manquante" }); return; }
    try {
      if (settings?.sendavapayApiKey) {
        const resp = await fetch(`${SENDAVAPAY_BASE}/v1/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.sendavapayApiKey}` },
          body: JSON.stringify({ reference }),
        });
        const json = await resp.json() as any;
        if (json.success && json.data?.externalReference) {
          const match = (json.data.externalReference as string).match(/^nexarix-activation-(\d+)$/);
          if (match) {
            const uid = parseInt(match[1]);
            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
            if (user && user.status !== "active") await activateUser(user);
          }
        }
      }
    } catch (_) {}
  }
  res.json({ received: true });
});

// ─── Spin Wheel (one-time after activation) ───────────────────────────────────
router.post("/spin", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status !== "active") { res.status(403).json({ error: "Compte non activé" }); return; }
  if (user.hasSpun) { res.status(400).json({ error: "Vous avez déjà utilisé votre roue de la fortune" }); return; }

  const pointsEarned = Math.floor(Math.random() * 200) + 1;

  await db.update(usersTable).set({
    points: sql`${usersTable.points} + ${pointsEarned}`,
    hasSpun: true,
  }).where(eq(usersTable.id, userId));

  res.json({ pointsEarned, totalPoints: (user.points || 0) + pointsEarned });
});

// ─── Internal: activate user + welcome bonus ──────────────────────────────────
async function activateUser(user: any) {
  await db.update(usersTable).set({
    status: "active",
    membership: "Premium",
    balance: sql`${usersTable.balance} + ${WELCOME_BONUS}`,
    welcomeBonus: sql`${usersTable.welcomeBonus} + ${WELCOME_BONUS}`,
  }).where(eq(usersTable.id, user.id));

  await sendTelegramNotification(
    `💰 <b>Nouveau dépôt / Activation</b>\n` +
    `👤 Utilisateur: <b>${user.username}</b>\n` +
    `📧 Email: ${user.email}\n` +
    `📱 Téléphone: ${user.phone || "—"}\n` +
    `🌍 Pays: ${user.country || "—"}\n` +
    `✅ Compte activé avec succès`
  );

  await distributeMLMCommissions(user);
}

// ─── MLM commission distribution ─────────────────────────────────────────────
async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;
  const commissions = [
    { field: "mlmEarningsL1", amount: 1300 },
    { field: "mlmEarningsL2", amount: 700 },
    { field: "mlmEarningsL3", amount: 400 },
  ];
  let currentUplineUsername = user.upline;
  let isLevel1 = true;

  for (const { field, amount } of commissions) {
    if (!currentUplineUsername) break;
    const [uplineUser] = await db.select().from(usersTable)
      .where(eq(usersTable.username, currentUplineUsername)).limit(1);
    if (!uplineUser) break;
    const mlmField = (usersTable as any)[field];
    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${amount}`,
      [field]: sql`${mlmField} + ${amount}`,
    }).where(eq(usersTable.id, uplineUser.id));

    if (isLevel1) {
      await checkAndGrantReferralBonus(uplineUser);
      isLevel1 = false;
    }
    currentUplineUsername = uplineUser.upline;
  }
}

// ─── Referral bonus: 1500F every 10 active direct referrals ──────────────────
async function checkAndGrantReferralBonus(uplineUser: any) {
  const activeReferrals = await db
    .select()
    .from(usersTable)
    .where(and(
      eq(usersTable.upline, uplineUser.username),
      eq(usersTable.status, "active")
    ));

  const activeCount = activeReferrals.length;

  if (activeCount > 0 && activeCount % REFERRAL_BONUS_STEP === 0) {
    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${REFERRAL_BONUS_AMOUNT}`,
    }).where(eq(usersTable.id, uplineUser.id));

    await sendTelegramNotification(
      `🎉 <b>Bonus filleuls débloqué !</b>\n` +
      `👤 Utilisateur: <b>${uplineUser.username}</b>\n` +
      `🏆 Palier atteint: <b>${activeCount} filleuls actifs directs</b>\n` +
      `💵 Bonus crédité: <b>${REFERRAL_BONUS_AMOUNT} FCFA</b>`
    );
  }
}

export default router;
