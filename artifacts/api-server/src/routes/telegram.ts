import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, withdrawalsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendReply(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

router.post("/telegram/webhook", async (req, res) => {
  res.json({ ok: true });

  const { message } = req.body;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text: string = message.text.trim();
  const command = text.split(" ")[0].toLowerCase().replace(/@\S+/, "");
  const args = text.split(" ").slice(1);

  if (command === "/stats") {
    const [userStats] = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
      inactive: sql<number>`sum(case when status = 'inactive' then 1 else 0 end)`,
    }).from(usersTable);

    const [withdrawStats] = await db.select({
      pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
      pendingAmount: sql<number>`sum(case when status = 'pending' then amount_gross::numeric else 0 end)`,
      paid: sql<number>`sum(case when status = 'paid' then 1 else 0 end)`,
    }).from(withdrawalsTable);

    await sendReply(chatId,
      `📊 <b>Statistiques Nexarix</b>\n\n` +
      `👥 <b>Membres</b>\n` +
      `• Total: ${userStats?.total ?? 0}\n` +
      `• Actifs: ${userStats?.active ?? 0}\n` +
      `• Inactifs: ${userStats?.inactive ?? 0}\n\n` +
      `💸 <b>Retraits</b>\n` +
      `• En attente: ${withdrawStats?.pending ?? 0} (${Number(withdrawStats?.pendingAmount ?? 0).toLocaleString()} FCFA)\n` +
      `• Payés: ${withdrawStats?.paid ?? 0}`
    );
    return;
  }

  if (command === "/pending") {
    const pending = await db.select({
      w: withdrawalsTable,
      username: usersTable.username,
    }).from(withdrawalsTable)
      .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .where(eq(withdrawalsTable.status, "pending"))
      .orderBy(sql`${withdrawalsTable.createdAt} ASC`)
      .limit(10);

    if (pending.length === 0) {
      await sendReply(chatId, "✅ Aucun retrait en attente.");
      return;
    }

    const lines = pending.map((p, i) =>
      `${i + 1}. [#${p.w.id}] <b>${p.username}</b> — ${parseFloat(p.w.amountNet || "0").toLocaleString()} FCFA (${p.w.operator} ${p.w.phone})`
    ).join("\n");

    await sendReply(chatId,
      `⏳ <b>${pending.length} retrait(s) en attente</b>\n\n${lines}\n\n` +
      `✅ /approve &lt;id&gt;\n` +
      `❌ /reject &lt;id&gt; &lt;raison&gt;`
    );
    return;
  }

  if (command === "/approve") {
    const id = parseInt(args[0]);
    if (isNaN(id)) {
      await sendReply(chatId, "❌ Usage : /approve &lt;id&gt;\nEx: /approve 12");
      return;
    }

    const [withdrawal] = await db.select({
      w: withdrawalsTable,
      username: usersTable.username,
    }).from(withdrawalsTable)
      .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .where(eq(withdrawalsTable.id, id))
      .limit(1);

    if (!withdrawal) {
      await sendReply(chatId, `❌ Retrait #${id} introuvable.`);
      return;
    }

    if (withdrawal.w.status !== "pending") {
      await sendReply(chatId, `⚠️ Le retrait #${id} est déjà <b>${withdrawal.w.status}</b>.`);
      return;
    }

    await db.update(withdrawalsTable)
      .set({ status: "paid" })
      .where(eq(withdrawalsTable.id, id));

    await sendReply(chatId,
      `✅ <b>Retrait #${id} approuvé</b>\n` +
      `👤 ${withdrawal.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountNet || "0").toLocaleString()} FCFA\n` +
      `📱 ${withdrawal.w.operator} — ${withdrawal.w.phone}`
    );

    sendTelegramNotification(
      `✅ <b>Retrait approuvé</b> par l'admin\n` +
      `🆔 ID: #${id} | 👤 ${withdrawal.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountNet || "0").toLocaleString()} FCFA → ${withdrawal.w.operator} ${withdrawal.w.phone}`
    );
    return;
  }

  if (command === "/reject") {
    const id = parseInt(args[0]);
    const reason = args.slice(1).join(" ").trim();

    if (isNaN(id)) {
      await sendReply(chatId, "❌ Usage : /reject &lt;id&gt; &lt;raison&gt;\nEx: /reject 12 Numéro invalide");
      return;
    }

    if (!reason) {
      await sendReply(chatId, "❌ Une raison est obligatoire.\nEx: /reject 12 Numéro invalide");
      return;
    }

    const [withdrawal] = await db.select({
      w: withdrawalsTable,
      user: usersTable,
    }).from(withdrawalsTable)
      .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .where(eq(withdrawalsTable.id, id))
      .limit(1);

    if (!withdrawal) {
      await sendReply(chatId, `❌ Retrait #${id} introuvable.`);
      return;
    }

    if (withdrawal.w.status !== "pending") {
      await sendReply(chatId, `⚠️ Le retrait #${id} est déjà <b>${withdrawal.w.status}</b>.`);
      return;
    }

    // Reject and restore user's balance
    await db.update(withdrawalsTable)
      .set({ status: "rejected", rejectionReason: reason })
      .where(eq(withdrawalsTable.id, id));

    await db.update(usersTable)
      .set({
        balance: sql`${usersTable.balance} + ${withdrawal.w.amountGross}`,
        totalWithdrawn: sql`${usersTable.totalWithdrawn} - ${withdrawal.w.amountNet}`,
      })
      .where(eq(usersTable.id, withdrawal.user.id));

    await sendReply(chatId,
      `❌ <b>Retrait #${id} rejeté</b>\n` +
      `👤 ${withdrawal.user.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountGross || "0").toLocaleString()} FCFA remboursé\n` +
      `📝 Raison: ${reason}`
    );

    sendTelegramNotification(
      `❌ <b>Retrait rejeté</b> par l'admin\n` +
      `🆔 ID: #${id} | 👤 ${withdrawal.user.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountGross || "0").toLocaleString()} FCFA remboursé\n` +
      `📝 ${reason}`
    );
    return;
  }

  if (command === "/membres") {
    const recent = await db.select().from(usersTable)
      .orderBy(sql`${usersTable.joinedAt} DESC`)
      .limit(5);

    const lines = recent.map((u, i) =>
      `${i + 1}. <b>${u.username}</b> (${u.country}) — ${u.status === "active" ? "✅ Actif" : "⏳ Inactif"}`
    ).join("\n");

    await sendReply(chatId,
      `👥 <b>5 derniers membres inscrits</b>\n\n${lines}`
    );
    return;
  }

  if (command === "/aide" || command === "/help" || command === "/start") {
    await sendReply(chatId,
      `🤖 <b>Commandes disponibles</b>\n\n` +
      `📊 /stats — statistiques globales\n` +
      `⏳ /pending — retraits en attente\n` +
      `✅ /approve &lt;id&gt; — approuver un retrait\n` +
      `❌ /reject &lt;id&gt; &lt;raison&gt; — rejeter un retrait\n` +
      `👥 /membres — 5 derniers inscrits\n` +
      `❓ /aide — afficher ce menu`
    );
    return;
  }
});

// Endpoint to register the webhook with Telegram
router.post("/telegram/setup-webhook", async (req, res) => {
  if (!BOT_TOKEN) {
    res.status(503).json({ error: "TELEGRAM_BOT_TOKEN not set" });
    return;
  }
  const { baseUrl } = req.body as { baseUrl?: string };
  const url = baseUrl || `${req.protocol}://${req.get("host")}`;
  const webhookUrl = `${url}/api/telegram/webhook`;

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
  });
  const json = await resp.json();
  res.json({ webhookUrl, result: json });
});

export default router;
