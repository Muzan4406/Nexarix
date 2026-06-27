import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Phone, Zap } from "lucide-react";

const PAYMENT_METHODS: Record<string, string[]> = {
  "Togo": ["TMoney", "Moov Money"],
  "Bénin": ["MTN Mobile Money", "Moov Money"],
  "Côte d'Ivoire": ["Orange Money", "MTN", "Moov", "Wave"],
  "Cameroun": ["MTN MoMo", "Orange Money"],
  "Burkina Faso": ["Orange Money", "Moov Money"],
  "Mali": ["Orange Money", "Moov"],
  "Niger": ["Airtel Money", "Moov"],
  "Sénégal": ["Wave", "Orange Money", "Free Money"],
};

export default function Activate() {
  const { user, logout } = useAuth();
  const operators = user?.country ? (PAYMENT_METHODS[user.country] || []) : [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight">NEXARIX</h1>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle>Activation du compte requise</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Votre compte est en attente d'activation. Un paiement unique de{" "}
                <span className="font-bold text-lg">3 000 XOF</span> est requis pour acceder a la plateforme.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Avantages apres activation
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Acces complet au tableau de bord</li>
                <li>• Bonus de bienvenue credite</li>
                <li>• Gain de commissions MLM (3 niveaux)</li>
                <li>• Participation aux taches remunererees</li>
                <li>• Retrait de vos gains</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Instructions de paiement
                {user?.country && <Badge variant="outline">{user.country}</Badge>}
              </h3>
              {operators.length > 0 ? (
                <div className="space-y-2">
                  {operators.map(op => (
                    <div key={op} className="flex items-center justify-between bg-muted rounded-lg px-4 py-3">
                      <span className="font-medium text-sm">{op}</span>
                      <span className="text-sm text-muted-foreground">Contactez le support</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Contactez le support pour les instructions de paiement.</p>
              )}
            </div>

            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              <p>Apres votre paiement, envoyez une capture d'ecran a notre support. Votre compte sera active sous 24h.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={logout} data-testid="button-logout">
                Deconnexion
              </Button>
              <Button className="flex-1" asChild data-testid="button-contact-support">
                <a href="https://wa.me/nexarix" target="_blank" rel="noopener noreferrer">Contacter le support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
