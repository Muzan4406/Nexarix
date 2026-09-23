import { createHmac, timingSafeEqual } from "crypto";

export type PaymentProvider = "ashtechpay" | "drimpay";

export const ASHTECHPAY_BASE = "https://ashtechpay.top";
export const DRIMPAY_LIVE_BASE = "https://drimpay.com/api/v2";
export const DRIMPAY_SANDBOX_BASE = "https://drimpay.com/sandbox-api/v2";

export const DRIMPAY_COUNTRIES: Record<string, string[]> = {
  TG: ["Flooz (Moov)", "T-Money"],
  BJ: ["Moov Money", "MTN Money"],
  CM: ["MTN Money", "Orange Money"],
  BF: ["Moov Money", "Orange Money"],
  ML: ["Moov Money", "Orange Money"],
  SN: ["Orange Money", "Wave Money", "Wizall"],
  CI: ["MTN Money", "Orange Money", "Moov Money", "Wave Money"],
};

const COUNTRY_CALLING_CODE: Record<string, string> = {
  TG: "228", BJ: "229", CI: "225", CM: "237", BF: "226",
  ML: "223", SN: "221", GN: "224", GA: "241", NE: "227",
  CD: "243",
};

export function getPaymentProvider(settings: any): PaymentProvider {
  return settings?.paymentProvider === "drimpay" ? "drimpay" : "ashtechpay";
}

export function getProviderApiKey(settings: any, provider = getPaymentProvider(settings)): string | null {
  return provider === "drimpay"
    ? settings?.drimpayApiKey || null
    : settings?.sendavapayApiKey || null;
}

export function getProviderWebhookSecret(settings: any): string | null {
  return settings?.drimpayWebhookSecret || null;
}

export function getDrimPayBase(apiKey: string): string {
  return apiKey.startsWith("dp_sandbox_sk_") ? DRIMPAY_SANDBOX_BASE : DRIMPAY_LIVE_BASE;
}

export function normalizeE164(phone: string, countryIso: string): string {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  return `+${COUNTRY_CALLING_CODE[countryIso] || ""}${compact}`;
}

export function toDrimPayOperator(operator: string, countryIso: string): string {
  const value = String(operator || "").trim().toLowerCase();
  if (["tmoney", "t-money", "t money"].includes(value) || value.includes("t-money")) return "tmoney";
  if (value.includes("wave")) return "wave";
  if (value.includes("orange")) return "orange";
  if (value.includes("wizall")) return "wizall";
  if (value.includes("mtn")) return "mtn";
  if (value.includes("moov") || value.includes("flooz")) return "moov";
  if (value.includes("airtel")) return "airtel";
  if (value.includes("vodacom") || value.includes("mpesa")) return "vodacom";
  return value || (countryIso === "TG" ? "tmoney" : "");
}

export function verifyDrimPayWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined,
  secret: string | null,
): boolean {
  if (!secret || !signatureHeader) return false;
  const timestamp = timestampHeader || signatureHeader.match(/(?:^|,)t=(\d+)/)?.[1];
  const provided = signatureHeader.match(/(?:^|,)v1=([a-f0-9]+)/i)?.[1];
  const timestampNumber = Number(timestamp);
  if (!timestamp || !provided || !Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  return expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);
}