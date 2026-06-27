const XAF_COUNTRIES = new Set([
  "Cameroun",
  "Gabon",
  "Tchad",
  "Congo",
  "République du Congo",
  "Centrafrique",
  "République Centrafricaine",
  "Guinée Équatoriale",
]);

export function getCurrencyCode(country?: string | null): "XAF" | "XOF" {
  if (!country) return "XOF";
  return XAF_COUNTRIES.has(country) ? "XAF" : "XOF";
}

export function formatCurrency(amount: number, country?: string | null): string {
  const code = getCurrencyCode(country);
  return `${amount.toLocaleString("fr-FR")} ${code}`;
}
