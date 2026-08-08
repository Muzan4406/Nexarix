import { Router } from "express";
import { db } from "@workspace/db";
import { withdrawalsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { sendTelegramNotification, escapeHtml } from "../lib/telegram";

const router = Router();
const DEFAULT_MIN_WITHDRAWAL = 3000;
const FLAT_FEE = 500; // frais fixes en FCFA
const ALLOWED_TYPES = ["Balance", "Tâches"] as const;
const MAX_PHONE_LEN = 20;
const MAX_OPERATOR_LEN = 60;

router.get("/withdrawals", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const withdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, userId))
    .orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  res.json(withdrawals.map(formatWithdrawal));
});

router.post("/withdrawals", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { type, operator, phone, amount: rawAmount } = req.body;

  // ── Validation des champs obligatoires ────────────────────────────────────
  if (!type || !operator || !phone || rawAmount === undefined || rawAmount === null) {
    res.status(400).json({ error: "Tous les champs sont requis" });
    return;
  }

  // ── Validation du type ────────────────────────────────────────────────────
  if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
    res.status(400).json({ error: "Type de retrait invalide" });
    return;
  }

  // ── Validation du montant (NaN / négatif / non-numérique) ─────────────────
  const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);
  if (!isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  // ── Validation opérateur / téléphone ──────────────────────────────────────
  if (typeof operator !== "string" || operator.trim().length === 0 || operator.length > MAX_OPERATOR_LEN) {
    res.status(400).json({ error: "Opérateur invalide" });
    return;
  }
  if (typeof phone !== "string" || phone.trim().length === 0 || phone.length > MAX_PHONE_LEN) {
    res.status(400).json({ error: "Numéro de téléphone invalide" });
    return;
  }

  const [settings] = await db.select().from(siteSettingsTable).limit(1);
  const minWithdrawal = parseFloat(settings?.minWithdrawal || String(DEFAULT_MIN_WITHDRAWAL));

  if (amount < minWithdrawal) {
    res.status(400).json({ error: `Minimum de retrait : ${minWithdrawal.toLocaleString("fr-FR")} FCFA` });
    return;
  }

  const isTaskWithdrawal = type === "Tâches";
  const fee = FLAT_FEE;
  const amountNet = Math.round((amount - fee) * 100) / 100;

  // ── Déduction atomique : vérifie le solde ET débite en une seule requête ──
  // Empêche la race condition (double retrait simultané)
  const balanceCol = isTaskWithdrawal ? usersTable.taskBalance : usersTable.balance;
  const updateResult = await db.update(usersTable)
    .set({
      ...(isTaskWithdrawal
        ? { taskBalance: sql`${usersTable.taskBalance} - ${amount}` }
        : { balance: sql`${usersTable.balance} - ${amount}` }),
      totalWithdrawn: sql`${usersTable.totalWithdrawn} + ${amountNet}`,
    })
    .where(
      and(
        eq(usersTable.id, userId),
        sql`${balanceCol}::numeric >= ${amount}`,  // solde suffisant au moment de l'update
      )
    )
    .returning({ id: usersTable.id, username: usersTable.username, country: usersTable.country });

  if (updateResult.length === 0) {
    // Soit l'utilisateur n'existe pas, soit le solde est insuffisant
    res.status(400).json({ error: "Solde insuffisant ou utilisateur introuvable" });
    return;
  }

  const user = updateResult[0];

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId,
    type,
    operator: operator.trim(),
    phone: phone.trim(),
    country: user.country || null,
    amountGross: amount.toString(),
    fee: fee.toString(),
    amountNet: amountNet.toString(),
    status: "pending",
  }).returning();

  const typeLabel = isTaskWithdrawal ? "Gains Tâches" : "Gains Parrainage";
  sendTelegramNotification(
    `💸 <b>Nouvelle demande de retrait</b>\n` +
    `📂 Type: <b>${typeLabel}</b>\n` +
    `👤 Utilisateur: <b>${escapeHtml(user.username)}</b>\n` +
    `🌍 Pays: ${escapeHtml(user.country || "—")}\n` +
    `📱 Téléphone: ${escapeHtml(phone.trim())}\n` +
    `🏦 Opérateur: ${escapeHtml(operator.trim())}\n` +
    `💰 Montant brut: <b>${amount.toLocaleString()} FCFA</b>\n` +
    `📉 Frais fixes: ${fee.toLocaleString()} FCFA\n` +
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
