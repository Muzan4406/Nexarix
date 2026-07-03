import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, withdrawalsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { sendTelegramNotification } from "../lib/telegram";

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID ?? "").trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendReply(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

/** Return true if the message comes from the authorised admin chat.
 *  Fail-closed: if TELEGRAM_CHAT_ID is not set, no one is authorised. */
function isAuthorised(chatId: number | string): boolean {
  if (!CHAT_ID) return false; // no chat configured → deny all commands
  return String(chatId) === CHAT_ID;
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

router.post("/telegram/webhook", async (req, res) => {
  // Always respond 200 immediately so Telegram doesn't retry
  res.json({ ok: true });

  const { message } = req.body ?? {};
  if (!message?.text) return;

  const chatId: number = message.chat.id;
  const rawText: string = message.text.trim();

  // Strip @botname suffix from commands (required for group messages)
  const command = rawText.split(" ")[0].toLowerCase().replace(/@\S+$/, "");
  const args = rawText.split(" ").slice(1);

  // Only process commands (starts with "/")
  if (!command.startsWith("/")) return;

  // Security: only react to configured admin group/chat
  if (!isAuthorised(chatId)) {
    await sendReply(chatId, "🔒 Accès non autorisé.");
    return;
  }

  // ── /start  /aide  /help ───────────────────────────────────────────────────
  if (["/start", "/aide", "/help"].includes(command)) {
    await sendReply(chatId,
      `🤖 <b>Nexarix Admin Bot</b>\n\n` +
      `📊 /stats — statistiques globales\n` +
      `⏳ /pending — retraits en attente\n` +
      `✅ /approve &lt;id&gt; — approuver un retrait\n` +
      `❌ /reject &lt;id&gt; &lt;raison&gt; — rejeter un retrait\n` +
      `👥 /membres — 10 derniers inscrits\n` +
      `🔍 /user &lt;username&gt; — infos d'un membre\n` +
      `🚫 /ban &lt;username&gt; — désactiver un compte\n` +
      `✅ /unban &lt;username&gt; — réactiver un compte\n` +
      `❓ /aide — afficher ce menu`
    );
    return;
  }

  // ── /stats ─────────────────────────────────────────────────────────────────
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
      paidAmount: sql<number>`sum(case when status = 'paid' then amount_net::numeric else 0 end)`,
    }).from(withdrawalsTable);

    await sendReply(chatId,
      `📊 <b>Statistiques Nexarix</b>\n\n` +
      `👥 <b>Membres</b>\n` +
      `• Total: <b>${userStats?.total ?? 0}</b>\n` +
      `• Actifs: ${userStats?.active ?? 0}\n` +
      `• Inactifs: ${userStats?.inactive ?? 0}\n\n` +
      `💸 <b>Retraits</b>\n` +
      `• En attente: ${withdrawStats?.pending ?? 0} (${Number(withdrawStats?.pendingAmount ?? 0).toLocaleString()} FCFA)\n` +
      `• Payés: ${withdrawStats?.paid ?? 0} (${Number(withdrawStats?.paidAmount ?? 0).toLocaleString()} FCFA)`
    );
    return;
  }

  // ── /pending ───────────────────────────────────────────────────────────────
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
      `${i + 1}. [#${p.w.id}] <b>${p.username}</b> — ${parseFloat(p.w.amountNet || "0").toLocaleString()} FCFA\n` +
      `   📱 ${p.w.operator} ${p.w.phone}`
    ).join("\n");

    await sendReply(chatId,
      `⏳ <b>${pending.length} retrait(s) en attente</b>\n\n${lines}\n\n` +
      `✅ /approve &lt;id&gt;   ❌ /reject &lt;id&gt; &lt;raison&gt;`
    );
    return;
  }

  // ── /approve <id> ──────────────────────────────────────────────────────────
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

    if (!withdrawal) { await sendReply(chatId, `❌ Retrait #${id} introuvable.`); return; }
    if (withdrawal.w.status !== "pending") {
      await sendReply(chatId, `⚠️ Retrait #${id} déjà <b>${withdrawal.w.status}</b>.`);
      return;
    }

    await db.update(withdrawalsTable).set({ status: "paid" }).where(eq(withdrawalsTable.id, id));

    await sendReply(chatId,
      `✅ <b>Retrait #${id} approuvé</b>\n` +
      `👤 ${withdrawal.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountNet || "0").toLocaleString()} FCFA\n` +
      `📱 ${withdrawal.w.operator} — ${withdrawal.w.phone}`
    );

    sendTelegramNotification(
      `✅ <b>Retrait approuvé</b>\n` +
      `🆔 #${id} | 👤 ${withdrawal.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountNet || "0").toLocaleString()} FCFA → ${withdrawal.w.operator} ${withdrawal.w.phone}`
    );
    return;
  }

  // ── /reject <id> <raison> ──────────────────────────────────────────────────
  if (command === "/reject") {
    const id = parseInt(args[0]);
    const reason = args.slice(1).join(" ").trim();

    if (isNaN(id)) { await sendReply(chatId, "❌ Usage : /reject &lt;id&gt; &lt;raison&gt;"); return; }
    if (!reason) { await sendReply(chatId, "❌ Une raison est obligatoire.\nEx: /reject 12 Numéro invalide"); return; }

    const [withdrawal] = await db.select({
      w: withdrawalsTable,
      user: usersTable,
    }).from(withdrawalsTable)
      .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
      .where(eq(withdrawalsTable.id, id))
      .limit(1);

    if (!withdrawal) { await sendReply(chatId, `❌ Retrait #${id} introuvable.`); return; }
    if (withdrawal.w.status !== "pending") {
      await sendReply(chatId, `⚠️ Retrait #${id} déjà <b>${withdrawal.w.status}</b>.`);
      return;
    }

    await db.update(withdrawalsTable)
      .set({ status: "rejected", rejectionReason: reason })
      .where(eq(withdrawalsTable.id, id));

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${withdrawal.w.amountGross}`,
      totalWithdrawn: sql`${usersTable.totalWithdrawn} - ${withdrawal.w.amountNet}`,
    }).where(eq(usersTable.id, withdrawal.user.id));

    await sendReply(chatId,
      `❌ <b>Retrait #${id} rejeté</b>\n` +
      `👤 ${withdrawal.user.username}\n` +
      `💰 ${parseFloat(withdrawal.w.amountGross || "0").toLocaleString()} FCFA remboursé\n` +
      `📝 ${reason}`
    );

    sendTelegramNotification(
      `❌ <b>Retrait rejeté</b>\n` +
      `🆔 #${id} | 👤 ${withdrawal.user.username}\n` +
      `📝 ${reason}`
    );
    return;
  }

  // ── /membres ───────────────────────────────────────────────────────────────
  if (command === "/membres") {
    const recent = await db.select().from(usersTable)
      .orderBy(desc(usersTable.joinedAt))
      .limit(10);

    if (recent.length === 0) { await sendReply(chatId, "👥 Aucun membre inscrit."); return; }

    const lines = recent.map((u, i) =>
      `${i + 1}. <b>${u.username}</b> (${u.country || "?"}) — ${u.status === "active" ? "✅ Actif" : "⏳ Inactif"}`
    ).join("\n");

    await sendReply(chatId, `👥 <b>10 derniers membres</b>\n\n${lines}`);
    return;
  }

  // ── /user <username> ───────────────────────────────────────────────────────
  if (command === "/user") {
    const username = args[0];
    if (!username) { await sendReply(chatId, "❌ Usage : /user &lt;username&gt;"); return; }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.username, username)).limit(1);

    if (!user) { await sendReply(chatId, `❌ Membre "${username}" introuvable.`); return; }

    const [wStats] = await db.select({
      total: sql<number>`count(*)`,
      paid: sql<number>`sum(case when status='paid' then amount_net::numeric else 0 end)`,
    }).from(withdrawalsTable).where(eq(withdrawalsTable.userId, user.id));

    await sendReply(chatId,
      `👤 <b>${user.username}</b>\n` +
      `📧 ${user.email || "—"}\n` +
      `📱 ${user.phone || "—"} (${user.country || "?"})\n` +
      `🔑 Statut: ${user.status === "active" ? "✅ Actif" : "⏳ Inactif"}\n` +
      `💰 Solde: ${parseFloat(String(user.balance ?? "0")).toLocaleString()} FCFA\n` +
      `💸 Retraits payés: ${Number(wStats?.paid ?? 0).toLocaleString()} FCFA (${wStats?.total ?? 0} fois)\n` +
      `📅 Inscrit le: ${user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("fr-FR") : "?"}`
    );
    return;
  }

  // ── /ban <username> ────────────────────────────────────────────────────────
  if (command === "/ban") {
    const username = args[0];
    if (!username) { await sendReply(chatId, "❌ Usage : /ban &lt;username&gt;"); return; }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.username, username)).limit(1);

    if (!user) { await sendReply(chatId, `❌ Membre "${username}" introuvable.`); return; }
    if (user.status === "inactive") {
      await sendReply(chatId, `⚠️ ${username} est déjà inactif.`); return;
    }

    await db.update(usersTable).set({ status: "inactive" }).where(eq(usersTable.id, user.id));
    await sendReply(chatId, `🚫 Compte <b>${username}</b> désactivé.`);
    sendTelegramNotification(`🚫 Compte <b>${username}</b> désactivé par l'admin.`);
    return;
  }

  // ── /unban <username> ──────────────────────────────────────────────────────
  if (command === "/unban") {
    const username = args[0];
    if (!username) { await sendReply(chatId, "❌ Usage : /unban &lt;username&gt;"); return; }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.username, username)).limit(1);

    if (!user) { await sendReply(chatId, `❌ Membre "${username}" introuvable.`); return; }

    await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, user.id));
    await sendReply(chatId, `✅ Compte <b>${username}</b> réactivé.`);
    return;
  }

  // Unknown command
  await sendReply(chatId, "❓ Commande inconnue. Tapez /aide pour la liste des commandes.");
});

// ─── Setup webhook ─────────────────────────────────────────────────────────────

router.post("/telegram/setup-webhook", async (req, res) => {
  if (!BOT_TOKEN) { res.status(503).json({ error: "TELEGRAM_BOT_TOKEN not set" }); return; }
  const { baseUrl } = req.body as { baseUrl?: string };
  const url = baseUrl || `${req.protocol}://${req.get("host")}`;
  const webhookUrl = `${url}/api/telegram/webhook`;

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });
  const json = await resp.json();
  res.json({ webhookUrl, result: json });
});

// ─── Auto-register webhook on startup ─────────────────────────────────────────

export async function autoSetupWebhook(): Promise<void> {
  if (!BOT_TOKEN) return;

  // Prefer the Replit public domain, fall back to nothing
  const domain =
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.APP_BASE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN;

  if (!domain) return;

  const webhookUrl = `https://${domain}/api/telegram/webhook`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      }),
    });
    const json = (await res.json()) as any;
    if (json.ok) {
      console.log(`[Telegram] Webhook enregistré → ${webhookUrl}`);
    } else {
      console.warn("[Telegram] setWebhook échoué:", json.description);
    }
  } catch (e) {
    console.warn("[Telegram] autoSetupWebhook exception:", e);
  }
}

export default router;
