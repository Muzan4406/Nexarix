import { Router } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
const SENDAVAPAY_BASE = "https://sendavapay.com/api";

// ─── Public settings (activation fee + payment mode) ─────────────────────────
router.get("/settings/public", async (_req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({}).returning();
  }
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
  if (!settings) { [settings] = await db.insert(siteSettingsTable).values({}).returning(); }

  if (settings.paymentMode !== "auto") {
    res.status(400).json({ error: "Le paiement automatique n'est pas activé" });
    return;
  }
  if (!settings.sendavapayApiKey) {
    res.status(503).json({ error: "La clé API Sendavapay n'est pas configurée" });
    return;
  }

  const activationFee = parseFloat(settings.activationFee || "3000");
  const baseUrl = settings.appBaseUrl || `${req.protocol}://${req.get("host")}`;
  const externalReference = `nexarix-activation-${user.id}`;

  try {
    const response = await fetch(`${SENDAVAPAY_BASE}/v1/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify({
        amount: activationFee,
        currency: "XOF",
        description: `Activation compte Nexarix — ${user.username}`,
        externalReference,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerName: user.username,
        redirectUrl: `${baseUrl}/payment-status`,
      }),
    });

    const json = await response.json() as any;

    if (!response.ok || !json.success) {
      res.status(502).json({ error: "Erreur Sendavapay", detail: json });
      return;
    }

    res.json({
      paymentUrl: json.data.paymentUrl,
      reference: json.data.reference,
    });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter Sendavapay", detail: e.message });
  }
});

// ─── Verify payment status (polling from frontend) ────────────────────────────
router.get("/activate/check", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { reference } = req.query as { reference?: string };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

  // If already active in DB — no need to call Sendavapay
  if (user.status === "active") {
    res.json({ status: "active" });
    return;
  }

  // Optionally verify via Sendavapay API if reference is provided
  if (reference) {
    try {
      const [settings] = await db.select().from(siteSettingsTable).limit(1);
      if (settings?.sendavapayApiKey) {
        const resp = await fetch(`${SENDAVAPAY_BASE}/v1/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.sendavapayApiKey}`,
          },
          body: JSON.stringify({ reference }),
        });
        const json = await resp.json() as any;
        if (json.success && json.data?.status === "completed") {
          // Activate user if Sendavapay confirms
          if (user.status !== "active") {
            await db.update(usersTable)
              .set({ status: "active", membership: "Premium" })
              .where(eq(usersTable.id, userId));
            await distributeMLMCommissions(user);
          }
          res.json({ status: "active" });
          return;
        }
      }
    } catch (_) {}
  }

  res.json({ status: user.status });
});

// ─── Webhook (called by Sendavapay dashboard configuration) ──────────────────
router.post("/activate/webhook", async (req, res) => {
  const signature = req.headers["x-sendavapay-signature"] as string | undefined;
  const event = req.headers["x-sendavapay-event"] as string | undefined;

  const [settings] = await db.select().from(siteSettingsTable).limit(1);

  // Verify HMAC-SHA256 signature if webhook secret is configured
  if (settings?.sendavapayWebhookSecret && signature) {
    const expected = createHmac("sha256", settings.sendavapayWebhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (expected !== signature) {
      res.status(401).json({ error: "Signature invalide" });
      return;
    }
  }

  const { data } = req.body as {
    event?: string;
    data?: { reference?: string; amount?: number; currency?: string; customerPhone?: string };
    timestamp?: string;
  };

  const eventType = event || req.body.event;

  if (eventType === "payment.completed") {
    const reference = data?.reference;
    if (!reference) { res.status(400).json({ error: "Reference manquante" }); return; }

    // Call Sendavapay to get externalReference (which contains our userId)
    try {
      if (settings?.sendavapayApiKey) {
        const resp = await fetch(`${SENDAVAPAY_BASE}/v1/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.sendavapayApiKey}`,
          },
          body: JSON.stringify({ reference }),
        });
        const json = await resp.json() as any;

        if (json.success && json.data?.externalReference) {
          const extRef: string = json.data.externalReference;
          // externalReference = "nexarix-activation-{userId}"
          const match = extRef.match(/^nexarix-activation-(\d+)$/);
          if (match) {
            const userId = parseInt(match[1]);
            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
            if (user && user.status !== "active") {
              await db.update(usersTable)
                .set({ status: "active", membership: "Premium" })
                .where(eq(usersTable.id, userId));
              await distributeMLMCommissions(user);
            }
          }
        }
      }
    } catch (_) {}
  }

  res.json({ received: true });
});

// ─── MLM commission distribution ─────────────────────────────────────────────
async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;
  const { sql } = await import("drizzle-orm");

  const commissions = [
    { level: 1, field: "mlmEarningsL1", amount: 1300 },
    { level: 2, field: "mlmEarningsL2", amount: 700 },
    { level: 3, field: "mlmEarningsL3", amount: 400 },
  ];

  let currentUplineUsername = user.upline;
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

    currentUplineUsername = uplineUser.upline;
  }
}

export default router;
