import { useEffect, useState } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, Download, CreditCard, Key, ToggleLeft, ToggleRight } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    supportEmail: "",
    telegramLink: "",
    whatsappLink: "",
    vcfLink: "",
    activationFee: "3000",
    paymentMode: "manual",
    sendavapayApiKey: "",
    sendavapayMerchantId: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        supportEmail: settings.supportEmail || "",
        telegramLink: settings.telegramLink || "",
        whatsappLink: settings.whatsappLink || "",
        vcfLink: settings.vcfLink || "",
        activationFee: String(settings.activationFee ?? 3000),
        paymentMode: settings.paymentMode || "manual",
        sendavapayApiKey: settings.sendavapayApiKey || "",
        sendavapayMerchantId: settings.sendavapayMerchantId || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        ...form,
        activationFee: parseFloat(form.activationFee) || 3000,
        vcfLink: form.vcfLink || null,
        sendavapayApiKey: form.sendavapayApiKey || null,
        sendavapayMerchantId: form.sendavapayMerchantId || null,
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

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground text-sm">Configuration de la plateforme</p>
        </div>

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
                data-testid="input-activation-fee"
              />
              <p className="text-xs text-muted-foreground mt-1">Montant affiché sur la page d'activation et le dashboard.</p>
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
                data-testid="toggle-payment-mode"
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
                    data-testid="input-sendavapay-api-key"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2 mb-1.5">
                    <Key className="h-4 w-4 text-blue-500" />Merchant ID Sendavapay
                  </Label>
                  <Input
                    value={form.sendavapayMerchantId}
                    onChange={e => setForm(f => ({ ...f, sendavapayMerchantId: e.target.value }))}
                    placeholder="merchant_..."
                    data-testid="input-sendavapay-merchant-id"
                  />
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Le webhook Sendavapay doit pointer vers : <code className="font-mono font-bold">/api/activate/webhook</code>
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
                data-testid="input-support-email"
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
                data-testid="input-telegram-link"
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
                data-testid="input-whatsapp-link"
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
                data-testid="input-vcf-link"
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? "Sauvegarde..." : "Sauvegarder tous les paramètres"}
        </Button>
      </div>
    </AdminLayout>
  );
}
