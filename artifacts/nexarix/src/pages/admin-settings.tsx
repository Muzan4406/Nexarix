import { useEffect, useState } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, Download, CreditCard, Key, ToggleLeft, ToggleRight, Globe, Copy, Check, ArrowDownToLine } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    supportEmail: "",
    telegramLink: "",
    whatsappLink: "",
    vcfLink: "",
    activationFee: "3000",
    minWithdrawal: "3000",
    paymentMode: "manual",
    sendavapayApiKey: "",
    sendavapayWebhookSecret: "",
    appBaseUrl: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        supportEmail: settings.supportEmail || "",
        telegramLink: settings.telegramLink || "",
        whatsappLink: settings.whatsappLink || "",
        vcfLink: settings.vcfLink || "",
        activationFee: String(settings.activationFee ?? 3000),
        minWithdrawal: String(settings.minWithdrawal ?? 3000),
        paymentMode: settings.paymentMode || "manual",
        sendavapayApiKey: settings.sendavapayApiKey || "",
        sendavapayWebhookSecret: settings.sendavapayWebhookSecret || "",
        appBaseUrl: settings.appBaseUrl || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        ...form,
        activationFee: parseFloat(form.activationFee) || 3000,
        minWithdrawal: parseFloat(form.minWithdrawal) || 3000,
        vcfLink: form.vcfLink || null,
        sendavapayApiKey: form.sendavapayApiKey || null,
        sendavapayWebhookSecret: form.sendavapayWebhookSecret || null,
        appBaseUrl: form.appBaseUrl || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        toast({ title: "✅ Paramètres sauvegardés" });
      },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  const togglePaymentMode = () => {
    setForm(f => ({ ...f, paymentMode: f.paymentMode === "auto" ? "manual" : "auto" }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = form.appBaseUrl || window.location.origin;
  const webhookUrl = `${baseUrl}/api/activate/webhook`;
  const redirectUrl = `${baseUrl}/payment-status`;

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground text-sm">Configuration de la plateforme</p>
        </div>

        {/* URL de base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Configuration des URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">URL de base de l'application</Label>
              <Input
                value={form.appBaseUrl}
                onChange={e => setForm(f => ({ ...f, appBaseUrl: e.target.value }))}
                placeholder="https://votre-domaine.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laisser vide pour utiliser le domaine actuel. À mettre à jour quand vous aurez votre domaine personnalisé.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URLs générées pour Sendavapay</p>

              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL de redirection (Return URL)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 bg-background rounded px-2 py-1.5 truncate font-mono border">
                      {redirectUrl}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(redirectUrl, "redirect")}
                    >
                      {copied === "redirect" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL Webhook</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 bg-background rounded px-2 py-1.5 truncate font-mono border">
                      {webhookUrl}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(webhookUrl, "webhook")}
                    >
                      {copied === "webhook" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Copiez ces URLs dans votre tableau de bord Sendavapay. Après changement de domaine, mettez à jour l'URL de base et re-copiez.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Frais d'activation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Frais d'activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Montant (XOF)</Label>
              <Input
                type="number"
                min="0"
                value={form.activationFee}
                onChange={e => setForm(f => ({ ...f, activationFee: e.target.value }))}
                placeholder="3000"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Montant affiché sur la page d'activation et le dashboard.</p>
            </div>
          </CardContent>
        </Card>

        {/* Retrait minimum */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-primary" />
              Retrait minimum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="mb-1.5 block">Montant minimum de retrait (XOF)</Label>
              <Input
                type="number"
                min="0"
                value={form.minWithdrawal}
                onChange={e => setForm(f => ({ ...f, minWithdrawal: e.target.value }))}
                placeholder="3000"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Les utilisateurs ne pourront pas soumettre une demande en dessous de ce montant.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mode de paiement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Mode de paiement — Sendavapay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between bg-muted rounded-xl p-4">
              <div>
                <p className="font-semibold text-sm">Paiement automatique</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {form.paymentMode === "auto"
                    ? "✅ Activé — Les utilisateurs paient via Sendavapay automatiquement"
                    : "❌ Désactivé — Paiement manuel via WhatsApp/Telegram"
                  }
                </p>
              </div>
              <button
                onClick={togglePaymentMode}
                className="shrink-0 text-primary hover:text-primary/80 transition-colors"
              >
                {form.paymentMode === "auto"
                  ? <ToggleRight className="h-10 w-10 text-emerald-500" />
                  : <ToggleLeft className="h-10 w-10 text-gray-400" />
                }
              </button>
            </div>

            {form.paymentMode === "auto" && (
              <>
                <div>
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Key className="h-4 w-4 text-amber-500" />Clé API Sendavapay
                  </Label>
                  <Input
                    value={form.sendavapayApiKey}
                    onChange={e => setForm(f => ({ ...f, sendavapayApiKey: e.target.value }))}
                    placeholder="sk_live_..."
                    type="password"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Key className="h-4 w-4 text-purple-500" />Secret Webhook Sendavapay
                  </Label>
                  <Input
                    value={form.sendavapayWebhookSecret}
                    onChange={e => setForm(f => ({ ...f, sendavapayWebhookSecret: e.target.value }))}
                    placeholder="whsec_..."
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Disponible dans votre tableau de bord Sendavapay sous "Webhooks".</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Liens de contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liens de contact & support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Mail className="h-4 w-4 text-primary" />Email Support
              </Label>
              <Input
                value={form.supportEmail}
                onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))}
                placeholder="support@nexarix.com"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <SiTelegram className="h-4 w-4 text-blue-500" />Lien Telegram
              </Label>
              <Input
                value={form.telegramLink}
                onChange={e => setForm(f => ({ ...f, telegramLink: e.target.value }))}
                placeholder="https://t.me/nexarix"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <SiWhatsapp className="h-4 w-4 text-green-500" />Lien WhatsApp
              </Label>
              <Input
                value={form.whatsappLink}
                onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))}
                placeholder="https://wa.me/..."
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Download className="h-4 w-4 text-muted-foreground" />Lien VCF (optionnel)
              </Label>
              <Input
                value={form.vcfLink}
                onChange={e => setForm(f => ({ ...f, vcfLink: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? "Sauvegarde..." : "Sauvegarder tous les paramètres"}
        </Button>
      </div>
    </AdminLayout>
  );
}
