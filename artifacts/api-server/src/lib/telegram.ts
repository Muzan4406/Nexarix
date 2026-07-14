import { logger } from "./logger";

// Échappe les caractères spéciaux HTML avant de les insérer dans un message
// Telegram en parse_mode HTML. Sans ça, une IP/User-Agent/identifiant forgé
// par un attaquant (ex: en-tête X-Forwarded-For) pourrait casser le format
// du message ou injecter du faux contenu/liens dans les alertes admin.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramNotification(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("Telegram non configuré : TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Telegram sendMessage failed");
    }
  } catch (err) {
    logger.error({ err }, "Telegram sendMessage exception");
  }
}
