import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, and, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification, escapeHtml } from "../lib/telegram";
import {
  ASHTECHPAY_BASE,
  getDrimPayBase,
  DRIMPAY_COUNTRIES,
  getPaymentProvider,
  getProviderApiKey,
  getProviderWebhookSecret,
  normalizeE164,
  toDrimPayOperator,
  verifyDrimPayWebhook,
} from "../lib/payment-provider";

const router = Router();
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
    paymentProvider: getPaymentProvider(settings),
    minWithdrawal: parseFloat(settings?.minWithdrawal || "3000"),
    supportEmail: settings?.supportEmail || null,
    telegramLink: settings?.telegramLink || null,
    telegramChannel: settings?.telegramChannel || null,
    whatsappLink: settings?.whatsappLink || null,
    vcfLink: settings?.vcfLink || null,
    maintenanceMode: settings?.maintenanceMode ?? false,
  });
});

// ─── Country operators proxy ───────────────────────────────────────────────────
router.get("/activate/countries", async (req, res) => {
  const { country_code } = req.query as { country_code?: string };

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const provider = getPaymentProvider(settings);

  if (provider === "drimpay") {
    if (country_code && !DRIMPAY_COUNTRIES[country_code]) {
      res.status(400).json({ error: "Pays non supporté par DrimPay" });
      return;
    }
    if (country_code) {
      res.json({ operators: DRIMPAY_COUNTRIES[country_code] || [] });
      return;
    }
    res.json(Object.entries(DRIMPAY_COUNTRIES).map(([code, operators]) => ({ code, operators })));
    return;
  }

  const apiKey = getProviderApiKey(settings, "ashtechpay");

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
    operatorOtp,
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
  const provider = getPaymentProvider(settings);
  const apiKey = getProviderApiKey(settings, provider);
  if (!apiKey) {
    res.status(503).json({ error: `La clé API ${provider === "drimpay" ? "DrimPay" : "AshtechPay"} n'est pas configurée` });
    return;
  }
  if (provider === "drimpay" && !getProviderWebhookSecret(settings)) {
    res.status(503).json({ error: "Le secret webhook DrimPay n'est pas configuré" });
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
    if (provider === "drimpay") {
      const response = await fetch(`${getDrimPayBase(apiKey)}/payin/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount: activationFee,
          currency,
          country_code: countryIso,
          operator: toDrimPayOperator(operator, countryIso),
          phone: normalizeE164(resolvedPhone, countryIso),
          order_id: reference,
          webhook_url: `${baseUrl}/api/activate/webhook`,
          description: `Activation Nexarix #${userId}`,
          expires_in_minutes: 5,
          ...(operatorOtp ? { operator_otp: String(operatorOtp).trim() } : {}),
          metadata: { userId, kind: "activation", orderId: reference },
        }),
      });
      const json = await response.json() as any;
      const drimPayErrorCode = json?.code ?? json?.error;
      if (response.status === 400 && drimPayErrorCode === "INVALID_OTP") {
        res.json({ flow: "otp", reference });
        return;
      }
      if (!response.ok) {
        res.status(502).json({ error: json?.message || json?.error || json?.code || "Erreur DrimPay" });
        return;
      }
      if (json.status === "success") {
        const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (freshUser) await activateUser(freshUser);
        res.json({ flow: "success", transactionId: json.reference, reference });
        return;
      }
      if (json.payment_url) {
        res.json({ flow: "wave", waveUrl: json.payment_url, transactionId: json.reference, reference });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: json.reference, reference });
      return;
    }

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
        Authorization: `Bearer ${apiKey}`,
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
    res.status(502).json({ error: `Impossible de contacter ${provider === "drimpay" ? "DrimPay" : "AshtechPay"} : ${e.message}` });
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
  const provider = getPaymentProvider(settings);
  const apiKey = getProviderApiKey(settings, provider);
  if (!apiKey) {
    res.status(503).json({ error: `${provider === "drimpay" ? "DrimPay" : "AshtechPay"} non configuré` });
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
    if (provider === "drimpay") {
      const response = await fetch(`${getDrimPayBase(apiKey)}/payin/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount: parseFloat(settings.activationFee || "3800"),
          currency,
          country_code: countryIso,
          operator: toDrimPayOperator(operator, countryIso),
          phone: normalizeE164(resolvedPhone, countryIso),
          order_id: otpReference,
          webhook_url: `${baseUrl}/api/activate/webhook`,
          description: `Activation Nexarix #${userId}`,
          expires_in_minutes: 5,
          operator_otp: String(otp).trim(),
          metadata: { userId, kind: "activation", orderId: otpReference },
        }),
      });
      const json = await response.json() as any;
      if (!response.ok) {
        res.status(response.status === 400 ? 400 : 502)
          .json({ error: json?.message || json?.error || json?.code || "Erreur DrimPay" });
        return;
      }
      if (json.payment_url) {
        res.json({ flow: "wave", waveUrl: json.payment_url, transactionId: json.reference });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: json.reference });
      return;
    }

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      const provider = getPaymentProvider(settings);
      const apiKey = getProviderApiKey(settings, provider);
      if (apiKey) {
        const statusUrl = provider === "drimpay"
          ? `${getDrimPayBase(apiKey)}/payin/${encodeURIComponent(transactionId)}`
          : `${ASHTECHPAY_BASE}/v1/transaction/${encodeURIComponent(transactionId)}`;
        const response = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const json = await response.json() as any;
        if (json.status === "success" || json.status === "completed") {
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
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (getPaymentProvider(settings) === "drimpay") {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const valid = verifyDrimPayWebhook(
      rawBody,
      req.header("x-drimpay-signature"),
      req.header("x-drimpay-timestamp"),
      getProviderWebhookSecret(settings),
    );
    if (!valid) {
      res.status(401).json({ error: "Signature DrimPay invalide" });
      return;
    }
  }
  res.status(200).json({ received: true });
  let payload: any;
  try {
    const body = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    payload = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return;
  }

  const event = payload?.event;
  const reference = payload?.metadata?.orderId || payload?.order_id || payload?.reference;
  const isSuccess = payload?.status === "completed" || payload?.status === "success" || event === "payin.success";
  if (isSuccess && typeof reference === "string") {
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
