import { Router } from "express";
import { db } from "@workspace/db";
import { withdrawalsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();
const DEFAULT_MIN_WITHDRAWAL = 3000;
const FEE_RATE = 0.05;

router.get("/withdrawals", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const withdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, userId))
    .orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  res.json(withdrawals.map(formatWithdrawal));
});

router.post("/withdrawals", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { type, operator, phone, amount } = req.body;

  if (!type || !operator || !phone || !amount) {
    res.status(400).json({ error: "Tous les champs sont requis" });
    return;
  }

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const minWithdrawal = parseFloat(settings?.minWithdrawal || String(DEFAULT_MIN_WITHDRAWAL));

  if (amount < minWithdrawal) {
    res.status(400).json({ error: `Minimum de retrait : ${minWithdrawal.toLocaleString("fr-FR")} FCFA` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  const currentBalance = parseFloat(user.balance || "0");
  if (currentBalance < amount) {
    res.status(400).json({ error: "Solde insuffisant" });
    return;
  }

  const fee = Math.round(amount * FEE_RATE * 100) / 100;
  const amountNet = Math.round((amount - fee) * 100) / 100;

  await db.update(usersTable)
    .set({
      balance: sql`${usersTable.balance} - ${amount}`,
      totalWithdrawn: sql`${usersTable.totalWithdrawn} + ${amountNet}`,
    })
    .where(eq(usersTable.id, userId));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId,
    type,
    operator,
    phone,
    country: user.country || null,
    amountGross: amount.toString(),
    fee: fee.toString(),
    amountNet: amountNet.toString(),
    status: "pending",
  }).returning();

  sendTelegramNotification(
    `💸 <b>Nouvelle demande de retrait</b>\n` +
    `👤 Utilisateur: <b>${user.username}</b>\n` +
    `🌍 Pays: ${user.country || "—"}\n` +
    `📱 Téléphone: ${phone}\n` +
    `🏦 Opérateur: ${operator}\n` +
    `💰 Montant brut: <b>${amount.toLocaleString()} FCFA</b>\n` +
    `📉 Frais (5%): ${fee.toLocaleString()} FCFA\n` +
    `✅ Montant net: <b>${amountNet.toLocaleString()} FCFA</b>`
  );

  res.status(201).json(formatWithdrawal(withdrawal));
});

function formatWithdrawal(w: any) {
  return {
    id: w.id,
    type: w.type,
    operator: w.operator,
    phone: w.phone,
    country: w.country,
    amountGross: parseFloat(w.amountGross || "0"),
    fee: parseFloat(w.fee || "0"),
    amountNet: parseFloat(w.amountNet || "0"),
    status: w.status,
    rejectionReason: w.rejectionReason,
    sendavapayReference: w.sendavapayReference,
    sendavapayStatus: w.sendavapayStatus,
    createdAt: w.createdAt?.toISOString(),
  };
}

export default router;
