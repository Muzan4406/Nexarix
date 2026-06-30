import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
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

const router = Router();
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
  const { country: formCountry, phone: formPhone } = req.body || {};

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

  if (!settings?.sendavapayApiKey) {
    res.status(503).json({ error: "Le paiement automatique n'est pas configuré" });
    return;
  }

  const resolvedCountry = formCountry || user.country || "";
  const resolvedPhone = formPhone || user.phone || "";
  const countryIso = COUNTRY_ISO[resolvedCountry] || "TG";
  const currency = CURRENCY_BY_ISO[countryIso] || "XOF";
  const amount = parseFloat(String(formation.price));
  const baseUrl = settings.appBaseUrl || "https://nexarix.replit.app";

  const [purchase] = await db
    .insert(formationPurchasesTable)
    .values({
      userId,
      formationId,
      amount: String(amount),
      status: "pending",
    })
    .returning();

  try {
    const payload = {
      amount,
      currency,
      description: `Achat formation "${formation.title}" — ${user.username}`,
      customerName: user.username,
      customerEmail: user.email || `${user.username}@nexarix.app`,
      customerPhone: resolvedPhone || undefined,
      payerCountry: countryIso,
      webhookUrl: `${baseUrl}/api/formations/purchase/webhook`,
      externalReference: `nexarix-formation-${purchase.id}`,
    };

    const response = await fetch(`${SENDAVAPAY_BASE}/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as any;

    if (!response.ok || !json.success) {
      await db
        .delete(formationPurchasesTable)
        .where(eq(formationPurchasesTable.id, purchase.id));
      const detail =
        json?.message || json?.error || json?.code || JSON.stringify(json);
      res.status(502).json({ error: detail });
      return;
    }

    await db
      .update(formationPurchasesTable)
      .set({
        sendavapayReference: json.data.reference,
        paymentToken: json.data.paymentToken,
      })
      .where(eq(formationPurchasesTable.id, purchase.id));

    res.json({
      paymentToken: json.data.paymentToken,
      reference: json.data.reference,
      purchaseId: purchase.id,
    });
  } catch (e: any) {
    await db
      .delete(formationPurchasesTable)
      .where(eq(formationPurchasesTable.id, purchase.id));
    res.status(502).json({
      error: "Impossible de contacter Sendavapay : " + e.message,
    });
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
      if (settings?.sendavapayApiKey) {
        const resp = await fetch(
          `${SENDAVAPAY_BASE}/payment-status/${reference}`,
          { headers: { Authorization: `Bearer ${settings.sendavapayApiKey}` } },
        );
        const json = (await resp.json()) as any;
        if (json.success && json.data?.status === "completed") {
          await completePurchaseByReference(reference);
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
  const rawBody: Buffer = req.body;
  const signature = req.headers["x-sendavapay-signature"] as string | undefined;
  const [settings] = await db.select().from(siteSettingsTable).limit(1);

  if (settings?.sendavapayWebhookSecret && signature) {
    const expected =
      "sha256=" +
      createHmac("sha256", settings.sendavapayWebhookSecret)
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

  const eventType =
    (req.headers["x-sendavapay-event"] as string) || payload.event;

  if (eventType === "payment.completed") {
    const reference = payload.reference || payload.externalReference;
    if (reference) {
      try {
        if (settings?.sendavapayApiKey) {
          const resp = await fetch(`${SENDAVAPAY_BASE}/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${settings.sendavapayApiKey}`,
            },
            body: JSON.stringify({ reference }),
          });
          const json = (await resp.json()) as any;
          if (json.success && json.data?.status === "completed") {
            const extRef = json.data.externalReference || payload.externalReference;
            await completePurchaseByExternalRef(extRef);
          }
        }
      } catch (_) {}
    }
  }

  res.json({ received: true });
});

async function completePurchaseByReference(sendavapayReference: string) {
  const [purchase] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.sendavapayReference, sendavapayReference),
        eq(formationPurchasesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!purchase) return;
  await completePurchase(purchase);
}

async function completePurchaseByExternalRef(externalRef: string) {
  const match =
    typeof externalRef === "string"
      ? externalRef.match(/^nexarix-formation-(\d+)$/)
      : null;
  if (!match) return;

  const purchaseId = parseInt(match[1]);
  const [purchase] = await db
    .select()
    .from(formationPurchasesTable)
    .where(
      and(
        eq(formationPurchasesTable.id, purchaseId),
        eq(formationPurchasesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!purchase) return;
  await completePurchase(purchase);
}

async function completePurchase(purchase: any) {
  await db
    .update(formationPurchasesTable)
    .set({ status: "completed" })
    .where(eq(formationPurchasesTable.id, purchase.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, purchase.userId))
    .limit(1);

  const [formation] = await db
    .select()
    .from(formationsTable)
    .where(eq(formationsTable.id, purchase.formationId))
    .limit(1);

  await sendTelegramNotification(
    `💳 <b>Formation achetée</b>\n` +
      `👤 Utilisateur: <b>${user?.username || purchase.userId}</b>\n` +
      `📚 Formation: <b>${formation?.title || purchase.formationId}</b>\n` +
      `💰 Montant: <b>${parseFloat(purchase.amount || "0").toLocaleString()} FCFA</b>`,
  );
}

export default router;
