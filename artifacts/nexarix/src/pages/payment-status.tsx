import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCheckActivationStatus } from "@workspace/api-client-react";
import { CheckCircle, XCircle, Loader, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL;

export default function PaymentStatus() {
  const [, navigate] = useLocation();
  const [urlStatus, setUrlStatus] = useState<"success" | "failed" | "pending">("pending");
  const [attempts, setAttempts] = useState(0);
  const payRef = sessionStorage.getItem("nexarix_pay_ref") || undefined;
  const { data: activationData, refetch } = useCheckActivationStatus({ reference: payRef });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status") || params.get("payment_status") || params.get("state");
    if (status === "success" || status === "completed" || status === "paid") {
      setUrlStatus("success");
    } else if (status === "failed" || status === "cancelled" || status === "error") {
      setUrlStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (activationData?.status === "active") {
      setUrlStatus("success");
    }
  }, [activationData]);

  useEffect(() => {
    if (urlStatus !== "success") return;
    const timer = setTimeout(() => navigate("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [urlStatus]);

  const handleRetryCheck = async () => {
    setAttempts(a => a + 1);
    const result = await refetch();
    if (result.data?.status === "active") {
      setUrlStatus("success");
    }
  };

  if (urlStatus === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl animate-bounce">
              <CheckCircle className="h-14 w-14 text-white" />
            </div>
          </div>

          <div className="mb-2">
            <img src={`${BASE}logo.png`} alt="Nexarix" className="h-10 mx-auto object-contain" />
          </div>

          <h1 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mb-2">
            Paiement réussi !
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Votre compte est maintenant <strong>activé</strong>. Bienvenue dans Nexarix !
          </p>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Accès complet débloqué</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Commissions MLM activées</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Retrait des gains disponible</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Redirection vers le dashboard dans quelques secondes...</span>
          </div>

          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Accéder au dashboard maintenant
          </Button>
        </div>
      </div>
    );
  }

  if (urlStatus === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl">
              <XCircle className="h-14 w-14 text-white" />
            </div>
          </div>

          <div className="mb-2">
            <img src={`${BASE}logo.png`} alt="Nexarix" className="h-10 mx-auto object-contain" />
          </div>

          <h1 className="text-2xl font-black text-red-600 dark:text-red-400 mb-2">
            Paiement échoué
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Le paiement n'a pas pu être complété. Vous pouvez réessayer ou contacter le support.
          </p>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-semibold mb-1">Causes possibles :</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Solde insuffisant sur le compte</li>
              <li>Paiement annulé</li>
              <li>Problème de réseau</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/activate")}
              className="w-full rounded-xl h-11 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-bold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer le paiement
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/activate")}
              className="w-full rounded-xl h-11"
            >
              Revenir à la page d'activation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-[#1565C0] flex items-center justify-center shadow-2xl">
            <Loader className="h-14 w-14 text-white animate-spin" />
          </div>
        </div>

        <div className="mb-2">
          <img src={`${BASE}logo.png`} alt="Nexarix" className="h-10 mx-auto object-contain" />
        </div>

        <h1 className="text-2xl font-black text-[#1565C0] mb-2">
          Vérification en cours...
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Nous vérifions le statut de votre paiement. Cela ne prend qu'un instant.
        </p>

        {attempts > 0 && (
          <p className="text-sm text-amber-600 mb-4">
            Paiement non encore confirmé. Veuillez patienter ou réessayer.
          </p>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleRetryCheck}
            className="w-full rounded-xl h-11 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-bold"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Vérifier maintenant
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/activate")}
            className="w-full rounded-xl h-11"
          >
            Revenir à la page d'activation
          </Button>
        </div>
      </div>
    </div>
  );
}
