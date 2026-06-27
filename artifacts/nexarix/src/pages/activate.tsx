import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPublicSettings, useInitiateActivation, useCheckActivationStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Zap, CheckCircle, LogOut, MessageCircle, CreditCard, Loader } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const PAYMENT_METHODS: Record<string, { name: string; color: string }[]> = {
  "Togo":          [{ name: "TMoney", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }, { name: "Moov Money", color: "bg-blue-100 text-blue-700 border-blue-200" }],
  "Bénin":         [{ name: "MTN Mobile Money", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }, { name: "Moov Money", color: "bg-blue-100 text-blue-700 border-blue-200" }],
  "Côte d'Ivoire": [{ name: "Orange Money", color: "bg-orange-100 text-orange-700 border-orange-200" }, { name: "MTN", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }, { name: "Wave", color: "bg-sky-100 text-sky-700 border-sky-200" }],
  "Cameroun":      [{ name: "MTN MoMo", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }, { name: "Orange Money", color: "bg-orange-100 text-orange-700 border-orange-200" }],
  "Burkina Faso":  [{ name: "Orange Money", color: "bg-orange-100 text-orange-700 border-orange-200" }, { name: "Moov Money", color: "bg-blue-100 text-blue-700 border-blue-200" }],
  "Mali":          [{ name: "Orange Money", color: "bg-orange-100 text-orange-700 border-orange-200" }, { name: "Moov", color: "bg-blue-100 text-blue-700 border-blue-200" }],
  "Niger":         [{ name: "Airtel Money", color: "bg-red-100 text-red-700 border-red-200" }, { name: "Moov", color: "bg-blue-100 text-blue-700 border-blue-200" }],
  "Sénégal":       [{ name: "Wave", color: "bg-sky-100 text-sky-700 border-sky-200" }, { name: "Orange Money", color: "bg-orange-100 text-orange-700 border-orange-200" }, { name: "Free Money", color: "bg-red-100 text-red-700 border-red-200" }],
};

const BENEFITS = [
  "Accès complet au tableau de bord",
  "Bonus de bienvenue crédité",
  "Commissions MLM sur 3 niveaux",
  "Participation aux tâches rémunérées",
  "Retrait de vos gains à tout moment",
];

export default function Activate() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: publicSettings } = useGetPublicSettings();
  const initiatePayment = useInitiateActivation();
  const { data: activationStatus, refetch: refetchStatus } = useCheckActivationStatus();
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [polling, setPolling] = useState(false);

  const operators = user?.country ? (PAYMENT_METHODS[user.country] || []) : [];
  const activationFee = publicSettings?.activationFee ?? 3000;
  const paymentMode = publicSettings?.paymentMode ?? "manual";

  useEffect(() => {
    if (activationStatus?.status === "active") {
      navigate("/dashboard");
    }
  }, [activationStatus]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (paymentInitiated && polling) {
      interval = setInterval(async () => {
        const result = await refetchStatus();
        if (result.data?.status === "active") {
          setPolling(false);
          navigate("/dashboard");
        }
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [paymentInitiated, polling]);

  const handleAutoPayment = () => {
    initiatePayment.mutate(undefined, {
      onSuccess: (data) => {
        if (data.paymentUrl) {
          if (data.reference) {
            sessionStorage.setItem("nexarix_pay_ref", data.reference);
          }
          window.location.href = data.paymentUrl;
        }
      },
      onError: () => {},
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#0D1B3E] via-[#1565C0] to-[#0D1B3E] p-4 py-8">

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl mb-3">
          <img
            src={`${BASE}logo.png`}
            alt="Nexarix"
            className="h-14 w-14 object-contain"
          />
        </div>
        <p className="text-white text-xl font-black tracking-tight">NEXARIX</p>
        <p className="text-blue-200 text-sm mt-1 font-medium tracking-wide">Activation du compte</p>
      </div>

      <div className="w-full max-w-sm space-y-4">

        {/* Carte principale — montant */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Activez votre compte</h2>
                <p className="text-sm text-gray-500">Paiement unique requis</p>
              </div>
            </div>

            {/* Prix */}
            <div className="bg-gradient-to-r from-[#1565C0] to-[#1E88E5] rounded-2xl p-4 text-center text-white mb-4">
              <p className="text-blue-100 text-xs mb-1">Frais d'activation</p>
              <p className="text-4xl font-black">{activationFee.toLocaleString("fr-FR")}</p>
              <p className="text-blue-200 text-sm font-medium">XOF (FCFA)</p>
            </div>

            {/* Avantages */}
            <div className="space-y-2">
              {BENEFITS.map(b => (
                <div key={b} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carte paiement */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className={`h-1.5 ${paymentMode === "auto" ? "bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />
          <div className="p-6">

            {paymentMode === "auto" ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Paiement en ligne</h3>
                  <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-600 border-blue-200">Automatique</Badge>
                </div>

                {paymentInitiated ? (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                      <Loader className="h-5 w-5 animate-spin" />
                      <span className="font-semibold text-sm">En attente de paiement...</span>
                    </div>
                    <p className="text-xs text-gray-500">La page de paiement s'est ouverte. Complétez le paiement puis revenez ici.</p>
                    <p className="text-xs text-gray-400 mt-2">Cette page se rafraîchit automatiquement.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      Payez directement en ligne via Mobile Money. Activation immédiate après confirmation.
                    </p>
                    <Button
                      onClick={handleAutoPayment}
                      disabled={initiatePayment.isPending}
                      className="w-full rounded-xl h-12 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-bold shadow-lg"
                    >
                      {initiatePayment.isPending ? (
                        <><Loader className="h-4 w-4 mr-2 animate-spin" />Initialisation...</>
                      ) : (
                        <><CreditCard className="h-4 w-4 mr-2" />Payer {activationFee.toLocaleString("fr-FR")} XOF</>
                      )}
                    </Button>
                    {initiatePayment.isError && (
                      <p className="text-xs text-red-500 text-center mt-2">
                        Erreur lors de l'initialisation du paiement. Veuillez réessayer ou contacter le support.
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Instructions de paiement</h3>
                  {user?.country && (
                    <Badge variant="outline" className="ml-auto text-xs">{user.country}</Badge>
                  )}
                </div>

                {operators.length > 0 ? (
                  <div className="space-y-2">
                    {operators.map(op => (
                      <div
                        key={op.name}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border ${op.color}`}
                      >
                        <span className="font-semibold text-sm">{op.name}</span>
                        <span className="text-xs opacity-70">Contactez le support</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                    Contactez le support pour les instructions.
                  </p>
                )}

                <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 text-center">
                  Après paiement, envoyez la capture d'écran au support.<br />
                  <span className="font-semibold">Activation sous 24h.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-11 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white font-medium backdrop-blur-sm"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
          {paymentMode === "manual" && (
            <Button
              className="flex-1 rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg"
              asChild
            >
              <a href={publicSettings ? "#" : "https://wa.me/nexarix"} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      <p className="mt-8 text-blue-300/60 text-xs text-center">© 2025 Nexarix · Tous droits réservés</p>
    </div>
  );
}
