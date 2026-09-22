import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, and, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification, escapeHtml } from "../lib/telegram";

const router = Router();
const SENDAVAPAY_BASE = "https://sendavapay.com/api/sdk/v1";
const WELCOME_BONUS = 50;
const REFERRAL_BONUS_AMOUNT = 1500;
const REFERRAL_BONUS_STEP = 10;

// SendavaPay-supported countries only
const COUNTRY_ISO: Record<string, string> = {
  "Togo": "TG",
  "Bénin": "BJ",
  "Côte d'Ivoire": "CI",
  "Cameroun": "CM",
  "Burkina Faso": "BF",
  "Mali": "ML",
  "Niger": "NE",
  "Sénégal": "SN",
  "Gabon": "GA",
  "RD Congo": "COD",
};

const CURRENCY_BY_ISO: Record<string, string> = {
  "TG": "XOF", "BJ": "XOF", "CI": "XOF", "ML": "XOF",
  "BF": "XOF", "NE": "XOF", "SN": "XOF",
  "CM": "XAF", "GA": "XAF",
  "CD": "CDF",
  "COD": "CDF",
};

// ─── Public settings ─────────────────────────────────────────────────────────
router.get("/settings/public", async (_req, res) => {
  // Lecture seule — aucune écriture sur un endpoint public
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  res.json({
    activationFee: parseFloat(settings?.activationFee || "3800"),
    paymentMode: settings?.paymentMode || "manual",
    minWithdrawal: parseFloat(settings?.minWithdrawal || "3000"),
    supportEmail: settings?.supportEmail || null,
    telegramLink: settings?.telegramLink || null,
    telegramChannel: settings?.telegramChannel || null,
    whatsappLink: settings?.whatsappLink || null,
    vcfLink: settings?.vcfLink || null,
    maintenanceMode: settings?.maintenanceMode ?? false,
  });
});

// ─── Country operators proxy (SendavaPay SDK v1) ─────────────────────────────
router.get("/activate/countries", async (req, res) => {
  const { country_code } = req.query as { country_code?: string };

  if (!country_code || !Object.values(COUNTRY_ISO).includes(country_code)) {
    res.status(400).json({ error: "Code pays invalide" });
    return;
  }

  try {
    const response = await fetch(
      `${SENDAVAPAY_BASE}/operators/${encodeURIComponent(country_code)}`,
    );
    const json = await response.json() as any;
    if (!response.ok || !json.success || !Array.isArray(json.data)) {
      res.status(502).json({ error: "Impossible de charger les opérateurs Mobile Money" });
      return;
    }

    res.json({
      operators: json.data
        .filter((operator: any) => operator.status === "online" && operator.available !== false)
        .map((operator: any) => ({
          id: String(operator.id),
          name: operator.name || operator.operator || operator.slug,
          slug: operator.slug,
          requiresOtp: Boolean(operator.requiresOtp),
        })),
    });
  } catch (_) {
    res.status(502).json({ error: "Service de paiement temporairement indisponible" });
  }
});

// ─── Create SendavaPay payment ────────────────────────────────────────────────
router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { country: formCountry, phone: formPhone, operatorId } = req.body || {};

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.status(400).json({ error: "Compte déjà activé" }); return; }

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();

  if (settings.paymentMode !== "auto") {
    res.status(400).json({ error: "Le paiement automatique n'est pas activé" });
    return;
  }
  if (!settings.sendavapayApiKey) {
    res.status(503).json({ error: "La clé API SendavaPay n'est pas configurée" });
    return;
  }
  if (!operatorId) {
    res.status(400).json({ error: "Veuillez sélectionner un opérateur Mobile Money" });
    return;
  }
  const activationFee = parseFloat(settings.activationFee || "3800");
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = (formPhone || user.phone || "").replace(/\s+/g, "");
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";

  // Persist country + phone to profile if missing
  if ((formCountry && !user.country) || (formPhone && !user.phone)) {
    await db.update(usersTable).set({
      ...(formCountry && !user.country ? { country: formCountry } : {}),
      ...(formPhone && !user.phone ? { phone: formPhone } : {}),
    }).where(eq(usersTable.id, userId));
  }

  // The external reference is the only user identifier accepted by the webhook.
  const externalReference = `nexarix-activation-${userId}-${Date.now()}`;

  try {
    const payload = {
      amount: activationFee,
      currency,
      description: `Activation Nexarix — ${user.username}`,
      customerName: user.username,
      customerEmail: user.email || `${user.username}@nexarix.app`,
      customerPhone: resolvedPhone || undefined,
      payerCountry: countryIso,
      webhookUrl: `${baseUrl}/api/activate/webhook`,
      externalReference,
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
    if (!response.ok || !json.success || !json.data?.paymentToken || !json.data?.reference) {
      const detail = json?.message || json?.error || json?.code || JSON.stringify(json);
      res.status(502).json({ error: detail });
      return;
    }

    const sdkResponse = await fetch(`${SENDAVAPAY_BASE}/initiate-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentToken: json.data.paymentToken,
        payerName: user.username,
        payerPhone: resolvedPhone,
        payerCountry: countryIso,
        operatorId: String(operatorId),
      }),
    });
    const sdkJson = await sdkResponse.json() as any;
    if (!sdkResponse.ok || !sdkJson.success) {
      const detail = sdkJson?.message || sdkJson?.error || JSON.stringify(sdkJson);
      res.status(502).json({ error: detail });
      return;
    }

    res.json({
      reference: json.data.reference,
      requiresRedirect: Boolean(sdkJson.requiresRedirect),
      redirectUrl: sdkJson.redirectUrl || null,
      requiresOtp: Boolean(sdkJson.requiresOtp),
      otpToken: sdkJson.otpToken || null,
    });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter SendavaPay : " + e.message });
  }
});

// ─── Submit OTP through the server-side SendavaPay proxy ──────────────────────
router.post("/activate/otp", authMiddleware, async (req, res) => {
  const { otpToken, otp } = req.body || {};
  if (!otpToken || !otp) {
    res.status(400).json({ error: "OTP et jeton OTP obligatoires" });
    return;
  }

  try {
    const response = await fetch(`${SENDAVAPAY_BASE}/submit-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otpToken, otp: String(otp).trim() }),
    });
    const json = await response.json() as any;
    if (!response.ok || !json.success) {
      res.status(502).json({ error: json?.message || json?.error || "Code OTP incorrect" });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(502).json({ error: "Erreur réseau SendavaPay : " + e.message });
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
        const payment = await verifyCompletedPayment(reference, settings.sendavapayApiKey);
        if (payment?.externalReference === undefined) {
          res.json({ status: user.status });
          return;
        }
        const expectedReference = new RegExp(`^nexarix-activation-${userId}-\\d+$`);
        if (
          payment.status === "completed" &&
          typeof payment.externalReference === "string" &&
          expectedReference.test(payment.externalReference)
        ) {
          const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
          if (freshUser && freshUser.status !== "active") {
            await activateUser(freshUser);
          }
          res.json({ status: "active" });
          return;
        }
      }
    } catch (_) {}
  }

  res.json({ status: user.status });
});

// ─── Webhook (SendavaPay payment.completed / payment.failed) ─────────────────
router.post("/activate/webhook", async (req, res) => {
  const rawBody: Buffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.headers["x-sendavapay-signature"] as string | undefined;
  const [settings] = await db.select().from(siteSettingsTable).limit(1);

  if (settings?.sendavapayWebhookSecret) {
    if (!signature) {
      res.status(401).json({ error: "Signature manquante" });
      return;
    }
    const expected = "sha256=" + createHmac("sha256", settings.sendavapayWebhookSecret)
      .update(rawBody)
      .digest("hex");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
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

  const event = req.headers["x-sendavapay-event"] as string || payload?.event;
  if (event === "payment.completed") {
    const reference = payload?.reference;
    try {
      if (reference && settings?.sendavapayApiKey) {
        const payment = await verifyCompletedPayment(reference, settings.sendavapayApiKey);
        if (payment?.status === "completed") {
          await activateUserByExternalReference(payment.externalReference);
        }
      }
    } catch (_) {
      // The provider will retry the webhook if it does not receive a 2xx response.
      res.status(502).json({ error: "Vérification du paiement impossible" });
      return;
    }
  }

  res.json({ received: true });
});

// ─── Spin Wheel ───────────────────────────────────────────────────────────────
router.post("/spin", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status !== "active") { res.status(403).json({ error: "Compte non activé" }); return; }
  if (user.hasSpun) { res.status(400).json({ error: "Roue déjà utilisée" }); return; }

  const fcfaEarned = Math.floor(Math.random() * 51) + 50;

  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${fcfaEarned}`,
    hasSpun: true,
  }).where(eq(usersTable.id, userId));

  res.json({ fcfaEarned, newBalance: parseFloat(user.balance || "0") + fcfaEarned });
});

// ─── Internal: activate user + welcome bonus ──────────────────────────────────
async function verifyCompletedPayment(reference: string, apiKey: string): Promise<any | null> {
  const response = await fetch(`${SENDAVAPAY_BASE}/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ reference }),
  });
  const json = await response.json() as any;
  if (!response.ok || !json.success || json.data?.status !== "completed") return null;
  return json.data;
}

async function activateUserByExternalReference(externalReference: unknown) {
  if (typeof externalReference !== "string") return false;
  const match = externalReference.match(/^nexarix-activation-(\d+)-\d+$/);
  if (!match) return false;

  const uid = parseInt(match[1], 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
  if (!user) return false;
  return activateUser(user);
}

async function activateUser(user: any) {
  // No welcome bonus — only the spin wheel grants a bonus after activation
  const [activatedUser] = await db.update(usersTable).set({
    status: "active",
    membership: "Premium",
  }).where(and(
    eq(usersTable.id, user.id),
    ne(usersTable.status, "active"),
  )).returning();

  // A webhook and a status poll can arrive at the same time. Only the first
  // transition may distribute commissions.
  if (!activatedUser) return false;

  await sendTelegramNotification(
    `💰 <b>Nouveau dépôt / Activation</b>\n` +
    `👤 Utilisateur: <b>${escapeHtml(activatedUser.username)}</b>\n` +
    `📧 Email: ${escapeHtml(activatedUser.email)}\n` +
    `📱 Téléphone: ${escapeHtml(activatedUser.phone || "—")}\n` +
    `🌍 Pays: ${escapeHtml(activatedUser.country || "—")}\n` +
    `✅ Compte activé avec succès`
  );

  await distributeMLMCommissions(activatedUser);
  return true;
}

// ─── MLM commission distribution ─────────────────────────────────────────────
async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;
  const commissions = [
    { field: "mlmEarningsL1", amount: 2000 },
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
      `👤 Utilisateur: <b>${escapeHtml(uplineUser.username)}</b>\n` +
      `🏆 Palier atteint: <b>${activeCount} filleuls actifs directs</b>\n` +
      `💵 Bonus crédité: <b>${REFERRAL_BONUS_AMOUNT} FCFA</b>`
    );
  }
}

export default router;
