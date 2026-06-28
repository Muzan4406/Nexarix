import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();
const SENDAVAPAY_BASE = "https://sendavapay.com/api/sdk/v1";
const WELCOME_BONUS = 50;
const REFERRAL_BONUS_AMOUNT = 1500;
const REFERRAL_BONUS_STEP = 10;

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

// ─── Public settings ─────────────────────────────────────────────────────────
router.get("/settings/public", async (_req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();
  res.json({
    activationFee: parseFloat(settings.activationFee || "3000"),
    paymentMode: settings.paymentMode || "manual",
    telegramLink: settings.telegramLink,
  });
});

// ─── Initiate Sendavapay payment (server-side create-payment) ─────────────────
router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  // Accept country + phone from form (fallback to user profile)
  const { country: formCountry, phone: formPhone } = req.body || {};

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.status(400).json({ error: "Compte déjà activé" }); return; }

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();

  if (settings.paymentMode !== "auto") { res.status(400).json({ error: "Le paiement automatique n'est pas activé" }); return; }
  if (!settings.sendavapayApiKey) { res.status(503).json({ error: "La clé API Sendavapay n'est pas configurée" }); return; }

  const activationFee = parseFloat(settings.activationFee || "3000");
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;

  // Prioritize form data over profile data
  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = formPhone || user.phone || "";
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";

  // Persist country + phone to profile if missing
  if ((formCountry && !user.country) || (formPhone && !user.phone)) {
    await db.update(usersTable).set({
      ...(formCountry && !user.country ? { country: formCountry } : {}),
      ...(formPhone && !user.phone ? { phone: formPhone } : {}),
    }).where(eq(usersTable.id, userId));
  }

  try {
    const payload = {
      amount: activationFee,
      currency,
      description: `Activation compte Nexarix — ${user.username}`,
      customerName: user.username,
      customerEmail: user.email || `${user.username}@nexarix.app`,
      customerPhone: resolvedPhone || undefined,
      payerCountry: countryIso,
      webhookUrl: `${baseUrl}/api/activate/webhook`,
      externalReference: `nexarix-activation-${user.id}`,
    };

    const response = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json() as any;
    if (!response.ok || !json.success) {
      // Return the actual Sendavapay error message so it shows in the UI
      const detail = json?.message || json?.error || json?.code || JSON.stringify(json);
      res.status(502).json({ error: detail });
      return;
    }
    res.json({
      paymentToken: json.data.paymentToken,
      reference: json.data.reference,
    });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter Sendavapay : " + e.message });
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
        const resp = await fetch(`${SENDAVAPAY_BASE}/payment-status/${reference}`, {
          headers: { "Authorization": `Bearer ${settings.sendavapayApiKey}` },
        });
        const json = await resp.json() as any;
        if (json.success && json.data?.status === "completed" && user.status !== "active") {
          await activateUser(user);
          res.json({ status: "active" });
          return;
        }
      }
    } catch (_) {}
  }
  res.json({ status: user.status });
});

// ─── Webhook (raw body for HMAC) ──────────────────────────────────────────────
router.post("/activate/webhook", async (req, res) => {
  const rawBody: Buffer = req.body;
  const signature = req.headers["x-sendavapay-signature"] as string | undefined;
  const [settings] = await db.select().from(siteSettingsTable).limit(1);

  if (settings?.sendavapayWebhookSecret && signature) {
    const expected = "sha256=" + createHmac("sha256", settings.sendavapayWebhookSecret)
      .update(rawBody)
      .digest("hex");
    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(401).json({ error: "Signature invalide" });
        return;
      }
    } catch {
      res.status(401).json({ error: "Signature invalide" });
      return;
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    res.status(400).json({ error: "Payload invalide" });
    return;
  }

  const eventType = req.headers["x-sendavapay-event"] as string || payload.event;

  if (eventType === "payment.completed") {
    const reference = payload.reference;
    const externalRef = payload.externalReference;
    if (!reference && !externalRef) { res.json({ received: true }); return; }

    try {
      if (settings?.sendavapayApiKey) {
        const refToVerify = reference || externalRef;
        const resp = await fetch(`${SENDAVAPAY_BASE}/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.sendavapayApiKey}`,
          },
          body: JSON.stringify({ reference: refToVerify }),
        });
        const json = await resp.json() as any;
        if (json.success && json.data?.status === "completed") {
          const extRef = json.data.externalReference || externalRef;
          const match = typeof extRef === "string" ? extRef.match(/^nexarix-activation-(\d+)$/) : null;
          if (match) {
            const uid = parseInt(match[1]);
            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
            if (user && user.status !== "active") await activateUser(user);
          }
        }
      }
    } catch (_) {}
  }

  if (eventType === "withdrawal.completed" || eventType === "withdrawal.failed") {
    const reference = payload.reference;
    const externalRef = payload.externalReference;
    if (reference || externalRef) {
      try {
        const ref = reference || externalRef;
        const newStatus = eventType === "withdrawal.completed" ? "completed" : "failed";

        const [withdrawal] = await db.update(withdrawalsTable)
          .set({ sendavapayStatus: newStatus })
          .where(eq(withdrawalsTable.sendavapayReference, ref))
          .returning();

        if (withdrawal && newStatus === "failed") {
          const amountToRefund = parseFloat(withdrawal.amountGross || "0");
          await db.update(usersTable)
            .set({ balance: sql`${usersTable.balance} + ${amountToRefund}` })
            .where(eq(usersTable.id, withdrawal.userId));

          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId)).limit(1);
          await sendTelegramNotification(
            `❌ <b>Retrait échoué — remboursement</b>\n` +
            `👤 Utilisateur: <b>${user?.username || withdrawal.userId}</b>\n` +
            `💰 Montant remboursé: <b>${amountToRefund.toLocaleString()} FCFA</b>\n` +
            `📱 Téléphone: ${withdrawal.phone}\n` +
            `🔖 Réf Sendavapay: ${ref}`
          );
        }

        if (withdrawal && newStatus === "completed") {
          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId)).limit(1);
          await sendTelegramNotification(
            `✅ <b>Retrait confirmé par Sendavapay</b>\n` +
            `👤 Utilisateur: <b>${user?.username || withdrawal.userId}</b>\n` +
            `💰 Montant net: <b>${parseFloat(withdrawal.amountNet || "0").toLocaleString()} FCFA</b>\n` +
            `📱 ${withdrawal.operator} — ${withdrawal.phone}`
          );
        }
      } catch (_) {}
    }
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
