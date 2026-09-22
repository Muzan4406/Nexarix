import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, and, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification, escapeHtml } from "../lib/telegram";

const router = Router();
const ASHTECHPAY_BASE = "https://ashtechpay.top";
const WELCOME_BONUS = 50;
const REFERRAL_BONUS_AMOUNT = 1500;
const REFERRAL_BONUS_STEP = 10;

// AshtechPay-supported countries only
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
  "RD Congo": "CD",
};

const CURRENCY_BY_ISO: Record<string, string> = {
  "TG": "XOF", "BJ": "XOF", "CI": "XOF", "ML": "XOF",
  "BF": "XOF", "NE": "XOF", "SN": "XOF",
  "CM": "XAF", "GA": "XAF",
  "CD": "CDF",
};

const FALLBACK_OPERATORS: Record<string, string[]> = {
  TG: ["Flooz (Moov)", "T-Money"],
  BJ: ["Celtiis Money", "Coris Money", "Moov Money", "MTN Money"],
  CI: ["Moov Money", "MTN Money", "Orange Money", "Wave Money"],
  CM: ["MTN Money", "Orange Money"],
  BF: ["Moov Money", "Orange Money", "Wallet LigdiCash"],
  ML: ["Moov Money", "Orange Money"],
  NE: ["Airtel Money"],
  SN: ["E-money", "Free Money", "Orange Money", "Wave Money"],
  GA: ["Airtel Money", "Moov Money"],
  CD: ["Afri Money", "Airtel", "Mpesa Money", "Orange", "Vodacom"],
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

// ─── Country operators proxy (AshtechPay /v1/countries) ──────────────────────
router.get("/activate/countries", async (req, res) => {
  const { country_code } = req.query as { country_code?: string };

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const apiKey = settings?.sendavapayApiKey;

  if (apiKey) {
    try {
      const response = await fetch(`${ASHTECHPAY_BASE}/v1/countries`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        const countries = await response.json() as any[];
        if (!Array.isArray(countries)) throw new Error("Réponse pays invalide");
        if (country_code) {
          if (!Object.values(COUNTRY_ISO).includes(country_code)) {
            res.status(400).json({ error: "Code pays invalide" });
            return;
          }
          res.json({
            operators: countries.find((country: any) => country.code === country_code)?.operators || [],
          });
          return;
        }
        res.json(countries);
        return;
      }
    } catch (_) {
      // Use the local list below when AshtechPay is temporarily unavailable.
    }
  }

  if (country_code && !Object.values(COUNTRY_ISO).includes(country_code)) {
    res.status(400).json({ error: "Code pays invalide" });
    return;
  }
  if (country_code) {
    res.json({ operators: FALLBACK_OPERATORS[country_code] || [] });
    return;
  }
  res.json(Object.entries(FALLBACK_OPERATORS).map(([code, operators]) => ({
    code,
    name: Object.entries(COUNTRY_ISO).find(([, value]) => value === code)?.[0] || code,
    operators,
  })));
});

// ─── Initiate AshtechPay payment ──────────────────────────────────────────────
router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const {
    country: formCountry,
    phone: formPhone,
    operator: formOperator,
    operatorId,
  } = req.body || {};
  const operator = formOperator || operatorId;

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
    res.status(503).json({ error: "La clé API AshtechPay n'est pas configurée" });
    return;
  }
  if (!operator) {
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

  const reference = `nexarix-act-${userId}-${Date.now()}`;

  try {
    const payload = {
      amount: activationFee,
      currency,
      phone: resolvedPhone,
      operator,
      country_code: countryIso,
      reference,
      notify_url: `${baseUrl}/api/activate/webhook`,
    };

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json() as any;
    if (response.status === 202) {
      if (json.flow === "wave" && json.wave_url) {
        res.json({ flow: "wave", waveUrl: json.wave_url, transactionId: json.transaction_id, reference });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: json.transaction_id, reference });
      return;
    }
    if (response.status === 400 && json.error === "otp_required") {
      res.json({ flow: "otp", reference: json.reference, ussdCode: json.ussd_code || null });
      return;
    }
    const detail = json?.message || json?.error || JSON.stringify(json);
    res.status(502).json({ error: detail });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter AshtechPay : " + e.message });
  }
});

// ─── Submit OTP through AshtechPay /v1/collect ─────────────────────────────────
router.post("/activate/otp", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const {
    country: formCountry,
    phone: formPhone,
    operator,
    otp,
    reference: otpReference,
  } = req.body || {};
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }
  if (user.status === "active") {
    res.json({ flow: "ussd_push", transactionId: null });
    return;
  }
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings?.sendavapayApiKey) {
    res.status(503).json({ error: "AshtechPay non configuré" });
    return;
  }
  if (!otp || !otpReference || !operator) {
    res.status(400).json({ error: "OTP, opérateur et référence obligatoires" });
    return;
  }

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = (formPhone || user.phone || "").replace(/\s+/g, "");
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
  const activationFee = parseFloat(settings.activationFee || "3800");
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;

  try {
    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify({
        amount: activationFee,
        currency,
        phone: resolvedPhone,
        operator,
        country_code: countryIso,
        otp: String(otp).trim(),
        reference: otpReference,
        notify_url: `${baseUrl}/api/activate/webhook`,
      }),
    });
    const json = await response.json() as any;
    if (response.status === 202) {
      if (json.flow === "wave" && json.wave_url) {
        res.json({ flow: "wave", waveUrl: json.wave_url, transactionId: json.transaction_id });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: json.transaction_id });
      return;
    }
    const detail = json?.message || json?.error || JSON.stringify(json);
    res.status(response.status).json({ error: detail });
  } catch (e: any) {
    res.status(502).json({ error: "Erreur réseau AshtechPay : " + e.message });
  }
});

// ─── Check activation status ──────────────────────────────────────────────────
router.get("/activate/check", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { transactionId } = req.query as { transactionId?: string };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.json({ status: "active" }); return; }

  if (transactionId) {
    try {
      const [settings] = await db.select().from(siteSettingsTable).limit(1);
      if (settings?.sendavapayApiKey) {
        const response = await fetch(`${ASHTECHPAY_BASE}/v1/transaction/${encodeURIComponent(transactionId)}`, {
          headers: { Authorization: `Bearer ${settings.sendavapayApiKey}` },
        });
        const json = await response.json() as any;
        if (json.status === "success") {
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

// ─── Webhook (AshtechPay payment.completed / payment.failed) ─────────────────
router.post("/activate/webhook", async (req, res) => {
  res.status(200).json({ received: true });
  let payload: any;
  try {
    const body = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    payload = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return;
  }

  const event = payload?.event;
  const reference = payload?.reference;
  if (event === "payment.completed" && payload?.status === "completed" && typeof reference === "string") {
    const match = reference.match(/^nexarix-act-(\d+)-\d+$/);
    if (!match) return;
    try {
      const [user] = await db.select().from(usersTable)
        .where(eq(usersTable.id, parseInt(match[1], 10))).limit(1);
      if (user && user.status !== "active") {
        await activateUser(user);
      }
    } catch (_) {}
  }
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
