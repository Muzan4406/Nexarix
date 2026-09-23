import { Router } from "express";
import { db } from "@workspace/db";
import {
  formationPurchasesTable,
  formationsTable,
  usersTable,
  siteSettingsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";
import {
  ASHTECHPAY_BASE,
  getDrimPayBase,
  getPaymentProvider,
  getProviderApiKey,
  getProviderWebhookSecret,
  normalizeE164,
  toDrimPayOperator,
  verifyAshtechWebhook,
  verifyDrimPayWebhook,
} from "../lib/payment-provider";

const router = Router();

const COUNTRY_ISO: Record<string, string> = {
  "Togo": "TG", "Bénin": "BJ", "Côte d'Ivoire": "CI",
  "Cameroun": "CM", "Burkina Faso": "BF", "Mali": "ML",
  "Niger": "NE", "Sénégal": "SN", "Guinée": "GN",
  "Gabon": "GA", "Tchad": "TD", "Congo": "COG",
  "République centrafricaine": "CF", "Guinée Équatoriale": "GQ", "RD Congo": "CD",
};

const CURRENCY_BY_ISO: Record<string, string> = {
  "TG": "XOF", "BJ": "XOF", "CI": "XOF", "ML": "XOF",
  "BF": "XOF", "NE": "XOF", "SN": "XOF", "GN": "GNF",
  "CM": "XAF", "COG": "XAF", "CF": "XAF", "GQ": "XAF", "GA": "XAF", "TD": "XAF",
  "CD": "CDF",
};

// List user's purchased formation IDs
router.get("/formations/my-purchases", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const purchases = await db
    .select({ formationId: formationPurchasesTable.formationId })
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.userId, userId),
        eq(formationPurchasesTable.status, "completed"),
      ),
    );
  res.json({ purchasedIds: purchases.map((p) => p.formationId) });
});

// Check if user purchased a specific formation
router.get("/formations/:id/purchase/check", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const formationId = parseInt(String(req.params.id));

  const [purchase] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.userId, userId),
        eq(formationPurchasesTable.formationId, formationId),
        eq(formationPurchasesTable.status, "completed"),
      ),
    )
    .limit(1);

  res.json({ purchased: !!purchase });
});

// Initiate payment for a formation
router.post("/formations/:id/purchase/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const formationId = parseInt(String(req.params.id));
  const { country: formCountry, phone: formPhone, operator, operatorOtp } = req.body || {};

  const [formation] = await db
    .select()
    .from(formationsTable)
    .where(eq(formationsTable.id, formationId))
    .limit(1);

  if (!formation) {
    res.status(404).json({ error: "Formation introuvable" });
    return;
  }

  if (formation.isFree || !formation.price) {
    res.status(400).json({ error: "Cette formation est gratuite" });
    return;
  }

  const [alreadyPurchased] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.userId, userId),
        eq(formationPurchasesTable.formationId, formationId),
        eq(formationPurchasesTable.status, "completed"),
      ),
    )
    .limit(1);

  if (alreadyPurchased) {
    res.status(400).json({ error: "Vous avez déjà acheté cette formation" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const [settings] = await db.select().from(siteSettingsTable).limit(1);

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

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = formPhone || user.phone || "";
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
  const amount = parseFloat(String(formation.price));
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;

  let [purchase] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.userId, userId),
        eq(formationPurchasesTable.formationId, formationId),
        eq(formationPurchasesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!purchase) {
    [purchase] = await db
      .insert(formationPurchasesTable)
      .values({
        userId,
        formationId,
        amount: String(amount),
        status: "pending",
      })
      .returning();
  }

  try {
    const orderId = `nexarix-formation-${purchase.id}`;
    if (provider === "drimpay") {
      const response = await fetch(`${getDrimPayBase(apiKey)}/payin/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          country_code: countryIso,
          operator: toDrimPayOperator(operator, countryIso),
          phone: normalizeE164(resolvedPhone, countryIso),
          order_id: orderId,
          webhook_url: `${baseUrl}/api/formations/purchase/webhook`,
          description: `Formation Nexarix #${formationId}`,
          expires_in_minutes: 5,
          ...(operatorOtp ? { operator_otp: String(operatorOtp).trim() } : {}),
          metadata: { purchaseId: purchase.id, kind: "formation", orderId },
        }),
      });
      const json = await response.json() as any;
      const drimPayErrorCode = json?.code ?? json?.error;
      if (response.status === 400 && drimPayErrorCode === "INVALID_OTP") {
        await db.update(formationPurchasesTable)
          .set({ sendavapayReference: orderId })
          .where(eq(formationPurchasesTable.id, purchase.id));
        res.json({ flow: "otp", reference: orderId, purchaseId: purchase.id });
        return;
      }
      if (!response.ok) {
        res.status(502).json({ error: json?.message || json?.error || json?.code || "Erreur DrimPay" });
        return;
      }
      const providerReference = json.reference || orderId;
      await db.update(formationPurchasesTable)
        .set({ sendavapayReference: providerReference })
        .where(eq(formationPurchasesTable.id, purchase.id));
      if (json.status === "success") {
        await completePurchase(purchase);
        res.json({ flow: "success", transactionId: providerReference, reference: providerReference, purchaseId: purchase.id });
        return;
      }
      if (json.payment_url) {
        res.json({ flow: "wave", waveUrl: json.payment_url, transactionId: providerReference, reference: providerReference, purchaseId: purchase.id });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: providerReference, reference: providerReference, purchaseId: purchase.id });
      return;
    }

    const payload = {
      amount,
      currency,
      phone: normalizeE164(resolvedPhone, countryIso),
      operator,
      country_code: countryIso,
      reference: `nexarix-formation-${purchase.id}`,
      notify_url: `${baseUrl}/api/formations/purchase/webhook`,
    };

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as any;
    const transactionId = json.transaction_id || json.reference || null;
    if (json.status === "success" || json.status === "completed") {
      await completePurchase(purchase);
      res.json({
        flow: "success",
        transactionId,
        reference: json.reference || `nexarix-formation-${purchase.id}`,
        purchaseId: purchase.id,
      });
      return;
    }

    if (response.status === 202) {
      await db
        .update(formationPurchasesTable)
        .set({ sendavapayReference: `nexarix-formation-${purchase.id}` })
        .where(eq(formationPurchasesTable.id, purchase.id));
      res.json({
        flow: json.flow === "wave" ? "wave" : "ussd_push",
        waveUrl: json.wave_url || null,
        transactionId,
        reference: `nexarix-formation-${purchase.id}`,
        purchaseId: purchase.id,
      });
      return;
    }
    if (response.status === 400 && json.error === "otp_required") {
      await db
        .update(formationPurchasesTable)
        .set({ sendavapayReference: json.reference || orderId })
        .where(eq(formationPurchasesTable.id, purchase.id));
      res.json({
        flow: "otp",
        reference: json.reference || orderId,
        ussdCode: json.ussd_code || null,
        purchaseId: purchase.id,
      });
      return;
    }
    const detail = json?.message || json?.error || JSON.stringify(json);
    res.status(502).json({ error: detail });
  } catch (e: any) {
    res.status(502).json({
      error: `Impossible de contacter ${provider === "drimpay" ? "DrimPay" : "AshtechPay"} : ${e.message}`,
    });
  }
});

// Submit an OTP for the pending formation payment through AshtechPay.
router.post("/formations/:id/purchase/otp", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const formationId = parseInt(String(req.params.id));
  const { country: formCountry, phone: formPhone, operator, otp, reference } = req.body || {};
  if (!operator || !otp || !reference) {
    res.status(400).json({ error: "OTP, opérateur et référence obligatoires" });
    return;
  }

  const [purchase] = await db.select().from(formationPurchasesTable).where(and(
    eq(formationPurchasesTable.userId, userId),
    eq(formationPurchasesTable.formationId, formationId),
    eq(formationPurchasesTable.status, "pending"),
  )).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [formation] = await db.select().from(formationsTable).where(eq(formationsTable.id, formationId)).limit(1);
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const provider = getPaymentProvider(settings);
  const apiKey = getProviderApiKey(settings, provider);
  if (!purchase || !user || !formation || !apiKey) {
    res.status(404).json({ error: "Paiement ou formation introuvable" });
    return;
  }

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = (formPhone || user.phone || "").replace(/\s+/g, "");
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
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
          amount: parseFloat(String(formation.price)),
          currency,
          country_code: countryIso,
          operator: toDrimPayOperator(operator, countryIso),
          phone: normalizeE164(resolvedPhone, countryIso),
          order_id: reference,
          webhook_url: `${baseUrl}/api/formations/purchase/webhook`,
          description: `Formation Nexarix #${formationId}`,
          expires_in_minutes: 5,
          operator_otp: String(otp).trim(),
          metadata: { purchaseId: purchase.id, kind: "formation", orderId: reference },
        }),
      });
      const json = await response.json() as any;
      if (!response.ok) {
        res.status(response.status === 400 ? 400 : 502)
          .json({ error: json?.message || json?.error || json?.code || "Erreur DrimPay" });
        return;
      }
      const providerReference = json.reference || reference;
      await db.update(formationPurchasesTable)
        .set({ sendavapayReference: providerReference })
        .where(eq(formationPurchasesTable.id, purchase.id));
      if (json.payment_url) {
        res.json({ flow: "wave", waveUrl: json.payment_url, transactionId: providerReference });
        return;
      }
      res.json({ flow: "ussd_push", transactionId: providerReference });
      return;
    }

    const response = await fetch(`${ASHTECHPAY_BASE}/v1/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount: parseFloat(String(formation.price)),
        currency,
        phone: normalizeE164(resolvedPhone, countryIso),
        operator,
        country_code: countryIso,
        otp: String(otp).trim(),
        reference,
        notify_url: `${baseUrl}/api/formations/purchase/webhook`,
      }),
    });
    const json = await response.json() as any;
    const transactionId = json.transaction_id || json.reference || null;
    if (json.status === "success" || json.status === "completed") {
      await completePurchase(purchase);
      res.json({ flow: "success", transactionId });
      return;
    }
    if (response.status === 202) {
      res.json({
        flow: json.flow === "wave" ? "wave" : "ussd_push",
        waveUrl: json.wave_url || null,
        transactionId,
      });
      return;
    }
    res.status(response.status).json({ error: json?.message || json?.error || JSON.stringify(json) });
  } catch (e: any) {
    res.status(502).json({ error: "Erreur réseau AshtechPay : " + e.message });
  }
});

// Poll payment status (frontend polling)
router.get("/formations/:id/purchase/status", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const formationId = parseInt(String(req.params.id));
  const { reference } = req.query as { reference?: string };

  const [completed] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.userId, userId),
        eq(formationPurchasesTable.formationId, formationId),
        eq(formationPurchasesTable.status, "completed"),
      ),
    )
    .limit(1);

  if (completed) {
    res.json({ status: "completed" });
    return;
  }

  if (reference) {
    try {
      const [settings] = await db.select().from(siteSettingsTable).limit(1);
      const provider = getPaymentProvider(settings);
      const apiKey = getProviderApiKey(settings, provider);
      if (apiKey) {
        const statusUrl = provider === "drimpay"
          ? `${getDrimPayBase(apiKey)}/payin/${encodeURIComponent(reference)}`
          : `${ASHTECHPAY_BASE}/v1/transaction/${encodeURIComponent(reference)}`;
        const resp = await fetch(
          statusUrl,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        const json = (await resp.json()) as any;
        if (json.status === "success" || json.status === "completed") {
          if (provider === "ashtechpay") {
            const [pendingPurchase] = await db
              .select()
              .from(formationPurchasesTable)
              .where(and(
                eq(formationPurchasesTable.userId, userId),
                eq(formationPurchasesTable.formationId, formationId),
                eq(formationPurchasesTable.status, "pending"),
              ))
              .limit(1);
            if (pendingPurchase) await completePurchase(pendingPurchase);
          } else {
            await completePurchaseByReference(reference);
          }
          res.json({ status: "completed" });
          return;
        }
      }
    } catch (_) {}
  }

  res.json({ status: "pending" });
});

// Webhook (raw body registered in app.ts)
router.post("/formations/purchase/webhook", async (req, res) => {
  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const provider = getPaymentProvider(settings);
  if (provider === "drimpay") {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const valid = verifyDrimPayWebhook(
      rawBody,
      req.header("x-drimpay-signature"),
      req.header("x-drimpay-timestamp"),
      getProviderWebhookSecret(settings, "drimpay"),
    );
    if (!valid) {
      res.status(401).json({ error: "Signature DrimPay invalide" });
      return;
    }
  } else {
    const ashtechSecret = getProviderWebhookSecret(settings, "ashtechpay");
    if (ashtechSecret) {
      const valid = verifyAshtechWebhook(
        Buffer.isBuffer(req.body) ? req.body : Buffer.from(""),
        req.header("x-ashtech-signature"),
        req.header("x-ashtech-timestamp"),
        ashtechSecret,
      );
      if (!valid) {
        res.status(401).json({ error: "Signature AshTech Pay invalide" });
        return;
      }
    }
  }
  let payload: any;
  try {
    const body = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    payload = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    res.status(400).json({ error: "Payload invalide" });
    return;
  }

  const eventType = payload.event;

  if ((eventType === "payment.completed" && payload.status === "completed") ||
      eventType === "payin.success" || payload.status === "success") {
    const reference = payload.metadata?.orderId || payload.order_id || payload.reference;
    if (reference) {
      let verified = provider !== "ashtechpay";
      if (provider === "ashtechpay") {
        const transactionId = payload.transaction_id;
        const apiKey = getProviderApiKey(settings, "ashtechpay");
        if (typeof transactionId === "string" && apiKey) {
          try {
            const statusResponse = await fetch(`${ASHTECHPAY_BASE}/v1/transaction/${encodeURIComponent(transactionId)}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            const statusJson = await statusResponse.json() as any;
            verified = statusResponse.ok && (statusJson.status === "success" || statusJson.status === "completed");
          } catch {
            verified = false;
          }
        }
      }
      if (!verified) return;
      try {
        await completePurchaseByReference(reference);
      } catch (_) {}
    }
  }

  res.json({ received: true });
});

async function completePurchaseByReference(paymentReference: string) {
  const orderMatch = String(paymentReference).match(/^nexarix-formation-(\d+)$/);
  const [purchase] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        orderMatch
          ? eq(formationPurchasesTable.id, parseInt(orderMatch[1], 10))
          : eq(formationPurchasesTable.sendavapayReference, paymentReference),
        eq(formationPurchasesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!purchase) return;
  await completePurchase(purchase);
}

async function completePurchase(purchase: any) {
  const [completedPurchase] = await db
    .update(formationPurchasesTable)
    .set({ status: "completed" })
    .where(and(
      eq(formationPurchasesTable.id, purchase.id),
      eq(formationPurchasesTable.status, "pending"),
    ))
    .returning();

  if (!completedPurchase) return false;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, completedPurchase.userId))
    .limit(1);

  const [formation] = await db
    .select()
    .from(formationsTable)
    .where(eq(formationsTable.id, completedPurchase.formationId))
    .limit(1);

  await sendTelegramNotification(
    `💳 <b>Formation achetée</b>\n` +
      `👤 Utilisateur: <b>${user?.username || completedPurchase.userId}</b>\n` +
      `📚 Formation: <b>${formation?.title || completedPurchase.formationId}</b>\n` +
      `💰 Montant: <b>${parseFloat(completedPurchase.amount || "0").toLocaleString()} FCFA</b>`,
  );
  return true;
}

export default router;
