import { useGetAdminSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

export default function Contact() {
  const { data: settings } = useGetAdminSettings();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Contactez-nous</h1>
          <p className="text-muted-foreground text-sm">Notre equipe est disponible pour vous aider</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Envoyez-nous un email pour tout support.</p>
              <a href={`mailto:${settings?.supportEmail || "support@nexarix.com"}`}
                className="text-primary font-medium text-sm hover:underline" data-testid="link-support-email">
                {settings?.supportEmail || "support@nexarix.com"}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SiTelegram className="h-5 w-5 text-blue-500" />
                Support Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Contactez notre support via Telegram pour une reponse rapide.</p>
              <Button asChild className="bg-blue-500 hover:bg-blue-600" data-testid="button-contact-telegram">
                <a href={settings?.telegramLink || "#"} target="_blank" rel="noopener noreferrer">
                  <SiTelegram className="mr-2 h-4 w-4" />
                  Ouvrir Telegram
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SiWhatsapp className="h-5 w-5 text-green-500" />
                Support WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Contactez-nous directement sur WhatsApp.</p>
              <Button asChild className="bg-green-500 hover:bg-green-600" data-testid="button-contact-whatsapp">
                <a href={settings?.whatsappLink || "#"} target="_blank" rel="noopener noreferrer">
                  <SiWhatsapp className="mr-2 h-4 w-4" />
                  Ouvrir WhatsApp
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
