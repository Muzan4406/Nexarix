import { useEffect, useState } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, ExternalLink, Download } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ supportEmail: "", telegramLink: "", whatsappLink: "", vcfLink: "" });

  useEffect(() => {
    if (settings) {
      setForm({ supportEmail: settings.supportEmail, telegramLink: settings.telegramLink, whatsappLink: settings.whatsappLink, vcfLink: settings.vcfLink || "" });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({ data: { ...form, vcfLink: form.vcfLink || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        toast({ title: "Parametres sauvegardes" });
      },
      onError: (err: any) => toast({ title: "Erreur", description: err?.data?.error, variant: "destructive" }),
    });
  };

  if (isLoading) return <AdminLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Parametres</h1>
          <p className="text-muted-foreground text-sm">Configuration des liens de support</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liens de contact & support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Mail className="h-4 w-4 text-primary" />Email Support
              </Label>
              <Input value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} placeholder="support@nexarix.com" data-testid="input-support-email" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <SiTelegram className="h-4 w-4 text-blue-500" />Lien Telegram
              </Label>
              <Input value={form.telegramLink} onChange={e => setForm(f => ({ ...f, telegramLink: e.target.value }))} placeholder="https://t.me/nexarix" data-testid="input-telegram-link" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <SiWhatsapp className="h-4 w-4 text-green-500" />Lien WhatsApp
              </Label>
              <Input value={form.whatsappLink} onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))} placeholder="https://wa.me/..." data-testid="input-whatsapp-link" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Download className="h-4 w-4 text-muted-foreground" />Lien VCF (optionnel)
              </Label>
              <Input value={form.vcfLink} onChange={e => setForm(f => ({ ...f, vcfLink: e.target.value }))} placeholder="https://..." data-testid="input-vcf-link" />
            </div>
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Sauvegarde..." : "Sauvegarder les parametres"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
