import { Router } from "express";
import { db } from "@workspace/db";
import { withdrawalsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();
const MIN_WITHDRAWAL = 3000;
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
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (amount < MIN_WITHDRAWAL) {
    res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} FCFA` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentBalance = parseFloat(user.balance || "0");
  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
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
    amountGross: amount.toString(),
    fee: fee.toString(),
    amountNet: amountNet.toString(),
    status: "pending",
  }).returning();

  res.status(201).json(formatWithdrawal(withdrawal));
});

function formatWithdrawal(w: any) {
  return {
    id: w.id,
    type: w.type,
    operator: w.operator,
    phone: w.phone,
    amountGross: parseFloat(w.amountGross || "0"),
    fee: parseFloat(w.fee || "0"),
    amountNet: parseFloat(w.amountNet || "0"),
    status: w.status,
    rejectionReason: w.rejectionReason,
    createdAt: w.createdAt?.toISOString(),
  };
}

export default router;
