import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

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

router.post("/activate/initiate", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.status === "active") {
    res.status(400).json({ error: "Account already activated" });
    return;
  }

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({}).returning();
  }

  if (settings.paymentMode !== "auto") {
    res.status(400).json({ error: "Le mode de paiement automatique n'est pas activé" });
    return;
  }

  if (!settings.sendavapayApiKey) {
    res.status(503).json({ error: "La clé API Sendavapay n'est pas configurée" });
    return;
  }

  const activationFee = parseFloat(settings.activationFee || "3000");

  try {
    const response = await fetch("https://api.sendavapay.com/v1/payment/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.sendavapayApiKey}`,
      },
      body: JSON.stringify({
        amount: activationFee,
        currency: "XOF",
        description: `Activation compte Nexarix - ${user.username}`,
        customer_email: user.email,
        customer_name: user.username,
        customer_phone: user.phone,
        merchant_id: settings.sendavapayMerchantId,
        reference: `nexarix-activation-${user.id}-${Date.now()}`,
        callback_url: `${process.env.APP_BASE_URL || ""}/api/activate/webhook`,
        return_url: `${process.env.APP_BASE_URL || ""}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: "Erreur de paiement Sendavapay", detail: err });
      return;
    }

    const data = await response.json() as { payment_url?: string; payment_id?: string; [key: string]: unknown };
    res.json({
      paymentUrl: data.payment_url,
      paymentId: data.payment_id,
    });
  } catch (e: any) {
    res.status(502).json({ error: "Impossible de contacter le service de paiement", detail: e.message });
  }
});

router.post("/activate/webhook", async (req, res) => {
  const { reference, status, payment_id } = req.body;

  if (!reference || !status) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  const match = reference.match(/^nexarix-activation-(\d+)-/);
  if (!match) {
    res.status(400).json({ error: "Invalid reference" });
    return;
  }

  const userId = parseInt(match[1]);

  if (status === "success" || status === "completed" || status === "paid") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user && user.status !== "active") {
      await db.update(usersTable)
        .set({ status: "active", membership: "Premium" })
        .where(eq(usersTable.id, userId));

      await distributeMLMCommissions(user);
    }
  }

  res.json({ received: true });
});

router.get("/activate/check", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ status: user.status });
});

async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;

  const commissions = [
    { level: 1, amount: 1300 },
    { level: 2, amount: 700 },
    { level: 3, amount: 400 },
  ];

  const { sql } = await import("drizzle-orm");

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

export default router;
