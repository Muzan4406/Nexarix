import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
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

// Fallback operators if API not reachable
const FALLBACK_OPERATORS: Record<string, string[]> = {
  "TG": ["Flooz (Moov)", "T-Money"],
  "BJ": ["Celtiis Money", "Coris Money", "Moov Money", "MTN Money"],
  "CI": ["Moov Money", "MTN Money", "Orange Money", "Wave Money"],
  "CM": ["MTN Money", "Orange Money"],
  "BF": ["Moov Money", "Orange Money", "Wallet LigdiCash"],
  "ML": ["Moov Money", "Orange Money"],
  "NE": ["Airtel Money"],
  "SN": ["E-money", "Free Money", "Orange Money", "Wave Money"],
  "GA": ["Airtel Money", "Moov Money"],
  "CD": ["Afri Money", "Airtel", "Mpesa Money", "Orange", "Vodacom"],
};

// ─── Public settings ─────────────────────────────────────────────────────────
router.get("/settings/public", async (_req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) [settings] = await db.insert(siteSettingsTable).values({}).returning();
  res.json({
    activationFee: parseFloat(settings.activationFee || "3800"),
    paymentMode: settings.paymentMode || "manual",
    minWithdrawal: parseFloat(settings.minWithdrawal || "3000"),
    supportEmail: settings.supportEmail || null,
    telegramLink: settings.telegramLink || null,
    telegramChannel: settings.telegramChannel || null,
    whatsappLink: settings.whatsappLink || null,
    vcfLink: settings.vcfLink || null,
    maintenanceMode: settings.maintenanceMode ?? false,
  });
});

// ─── Country operators proxy (AshtechPay /v1/countries) ──────────────────────
router.get("/activate/countries", async (req, res) => {
  const { country_code } = req.query as { country_code?: string };

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const apiKey = settings?.sendavapayApiKey;

  // Try live AshtechPay countries endpoint
  if (apiKey) {
    try {
      const resp = await fetch(`${ASHTECHPAY_BASE}/v1/countries`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (resp.ok) {
        const countries = await resp.json() as any[];
        if (country_code) {
          const country = countries.find((c: any) => c.code === country_code);
          res.json({ operators: country?.operators || [] });
          return;
        }
        res.json(countries);
        return;
      }
    } catch (_) {}
  }

  // Fallback to hardcoded list
  if (country_code) {
    res.json({ operators: FALLBACK_OPERATORS[country_code] || [] });
    return;
  }
  res.json(
    Object.entries(FALLBACK_OPERATORS).map(([code, operators]) => ({
      code,
      name: Object.entries(COUNTRY_ISO).find(([, v]) => v === code)?.[0] || code,
      operators,
    }))
  );
});

// ─── Initiate AshtechPay payment ──────────────────────────────────────────────
router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { country: formCountry, phone: formPhone, operator: formOperator } = req.body || {};

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
  if (!formOperator) {
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

  // Unique reference for this attempt (includes userId for webhook matching)
  const reference = `nexarix-act-${userId}-${Date.now()}`;

  try {
    const payload: any = {
      amount: activationFee,
      currency,
      phone: resolvedPhone,
      operator: formOperator,
      country_code: countryIso,
      reference,
      notify_url: `${baseUrl}/api/activate/webhook`,
    };

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json() as any;

    // 202 — payment initiated
    if (response.status === 202) {
      if (json.flow === "wave" && json.wave_url) {
        res.json({ flow: "wave", waveUrl: json.wave_url, transactionId: json.transaction_id, reference });
        return;
      }
      // USSD Push — wait for webhook
      res.json({ flow: "ussd_push", transactionId: json.transaction_id, reference });
      return;
    }

    // 400 otp_required — need OTP from user
    if (response.status === 400 && json.error === "otp_required") {
      res.json({
        flow: "otp",
        reference: json.reference,   // AshtechPay reference (mandatory for retry)
        ussdCode: json.ussd_code || null,
      });
      return;
    }

    // Any other error
    const detail = json?.message || json?.error || JSON.stringify(json);
    res.status(502).json({ error: detail });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter AshtechPay : " + e.message });
  }
});

// ─── Submit OTP (retry /v1/collect with OTP) ─────────────────────────────────
router.post("/activate/otp", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { country: formCountry, phone: formPhone, operator: formOperator, otp, reference: otpRef } = req.body || {};

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  if (user.status === "active") { res.json({ flow: "ussd_push", transactionId: null }); return; }

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings?.sendavapayApiKey) {
    res.status(503).json({ error: "AshtechPay non configuré" });
    return;
  }
  if (!otp || !otpRef) {
    res.status(400).json({ error: "OTP et référence obligatoires" });
    return;
  }

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = (formPhone || user.phone || "").replace(/\s+/g, "");
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
  const activationFee = parseFloat(settings.activationFee || "3800");
  const baseUrl = settings.appBaseUrl || "https://nexarix.replit.app";

  try {
    const payload: any = {
      amount: activationFee,
      currency,
      phone: resolvedPhone,
      operator: formOperator,
      country_code: countryIso,
      otp,
      reference: otpRef,
      notify_url: `${baseUrl}/api/activate/webhook`,
    };

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify(payload),
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
    res.status(502).json({ error: "Erreur réseau : " + e.message });
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
        const resp = await fetch(`${ASHTECHPAY_BASE}/v1/transaction/${transactionId}`, {
          headers: { "Authorization": `Bearer ${settings.sendavapayApiKey}` },
        });
        const json = await resp.json() as any;
        if (json.status === "success") {
          // Activate user if not yet active
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
  // Respond 200 immediately as required by AshtechPay docs
  res.status(200).json({ received: true });

  let payload: any;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (Buffer.isBuffer(payload)) payload = JSON.parse(payload.toString());
  } catch {
    return;
  }

  const event = payload?.event;
  const reference = payload?.reference;
  const transactionId = payload?.transaction_id;
  const status = payload?.status;

  if (event === "payment.completed" && status === "completed" && reference) {
    // Match nexarix-act-{userId}-{timestamp} pattern
    const match = reference.match(/^nexarix-act-(\d+)-\d+$/);
    if (match) {
      try {
        const uid = parseInt(match[1]);
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1);
        if (user && user.status !== "active") {
          await activateUser(user);
        }
      } catch (_) {}
    }
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
  await db.update(usersTable).set({
    status: "active",
    membership: "Premium",
    balance: sql`${usersTable.balance} + ${WELCOME_BONUS}`,
    welcomeBonus: sql`${usersTable.welcomeBonus} + ${WELCOME_BONUS}`,
  }).where(eq(usersTable.id, user.id));

  await sendTelegramNotification(
    `💰 <b>Nouveau dépôt / Activation</b>\n` +
    `👤 Utilisateur: <b>${escapeHtml(user.username)}</b>\n` +
    `📧 Email: ${escapeHtml(user.email)}\n` +
    `📱 Téléphone: ${escapeHtml(user.phone || "—")}\n` +
    `🌍 Pays: ${escapeHtml(user.country || "—")}\n` +
    `✅ Compte activé avec succès`
  );

  await distributeMLMCommissions(user);
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
