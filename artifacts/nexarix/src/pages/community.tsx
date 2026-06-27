import { useGetAdminSettings } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, MessageCircle, Users } from "lucide-react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";

export default function Community() {
  const { data: settings } = useGetAdminSettings();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Communaute</h1>
          <p className="text-muted-foreground text-sm">Rejoignez nos canaux de communication</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SiTelegram className="h-5 w-5 text-blue-500" />
                Canal Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Rejoignez notre canal Telegram pour les actualites, alertes et annonces officielles.
              </p>
              <Button className="w-full bg-blue-500 hover:bg-blue-600" asChild data-testid="button-telegram">
                <a href={settings?.telegramLink || "#"} target="_blank" rel="noopener noreferrer">
                  <SiTelegram className="mr-2 h-4 w-4" />
                  Rejoindre Telegram
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SiWhatsapp className="h-5 w-5 text-green-500" />
                Communaute WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Rejoignez notre groupe WhatsApp pour echanger avec les membres et recevoir du support.
              </p>
              <Button className="w-full bg-green-500 hover:bg-green-600" asChild data-testid="button-whatsapp">
                <a href={settings?.whatsappLink || "#"} target="_blank" rel="noopener noreferrer">
                  <SiWhatsapp className="mr-2 h-4 w-4" />
                  Rejoindre WhatsApp
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {settings?.vcfLink && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-5 w-5 text-muted-foreground" />
                  Contacts VCF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Telechargez le fichier VCF pour sauvegarder les contacts importants de Nexarix.
                </p>
                <Button variant="outline" className="w-full" asChild data-testid="button-download-vcf">
                  <a href={settings.vcfLink} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Telecharger VCF
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
