import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPublicSettings, useInitiateActivation, useCheckActivationStatus } from "@workspace/api-client-react";
import { Phone, Zap, CheckCircle, LogOut, MessageCircle, CreditCard, Loader, RefreshCw, RotateCcw, Smartphone, AlertCircle } from "lucide-react";
import { getCurrencyCode } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;
const SENDAVAPAY_CLIENT = "https://sendavapay.com/api/sdk/v1";

const COUNTRY_CODES: Record<string, string> = {
  "Togo": "TG", "Bénin": "BJ", "Côte d'Ivoire": "CI",
  "Cameroun": "CM", "Burkina Faso": "BF", "Mali": "ML",
  "Niger": "NE", "Sénégal": "SN", "Guinée": "GN",
  "Gabon": "GA", "Tchad": "TD", "Congo": "COG",
  "République centrafricaine": "CF", "Guinée Équatoriale": "GQ", "RD Congo": "COD",
};

const MANUAL_OPERATORS: Record<string, { name: string; color: string }[]> = {
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
  "Commissions MLM sur 3 niveaux",
  "Participation aux tâches rémunérées",
  "Retrait de vos gains à tout moment",
];

type Phase = "idle" | "selecting" | "initiating" | "otp" | "waiting" | "error";

interface SdkOperator { id: string; name: string; requiresOtp: boolean; status: string }

export default function Activate() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: publicSettings } = useGetPublicSettings();
  const initiatePayment = useInitiateActivation();
  const { data: activationStatus, refetch: refetchStatus } = useCheckActivationStatus();

  const [phase, setPhase] = useState<Phase>("idle");
  const [paymentToken, setPaymentToken] = useState("");
  const [reference, setReference] = useState("");
  const [sdkOperators, setSdkOperators] = useState<SdkOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<SdkOperator | null>(null);
  const [phone, setPhone] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const paymentMode = publicSettings?.paymentMode ?? "manual";
  const activationFee = publicSettings?.activationFee ?? 3000;
  const manualOperators = user?.country ? (MANUAL_OPERATORS[user.country] || []) : [];
  const countryCode = COUNTRY_CODES[user?.country || ""] || "TG";

  useEffect(() => {
    if (activationStatus?.status === "active") navigate("/dashboard");
  }, [activationStatus]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const interval = setInterval(async () => {
      const result = await refetchStatus();
      if (result.data?.status === "active") navigate("/dashboard");
    }, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  // Pre-fill phone from user profile
  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  const handleLogout = () => { logout(); navigate("/"); };

  const handleStartAutoPayment = () => {
    initiatePayment.mutate(undefined, {
      onSuccess: async (data) => {
        setPaymentToken(data.paymentToken);
        setReference(data.reference);
        setLoadingOperators(true);
        setPhase("selecting");
        try {
          const resp = await fetch(`${SENDAVAPAY_CLIENT}/operators/${countryCode}`);
          const json = await resp.json() as any;
          if (json.success && Array.isArray(json.data)) {
            setSdkOperators(json.data.filter((op: SdkOperator) => op.status === "online"));
          }
        } catch {
          setErrorMsg("Impossible de charger les opérateurs. Réessayez.");
        } finally {
          setLoadingOperators(false);
        }
      },
      onError: () => {
        setErrorMsg("Erreur de connexion. Réessayez ou contactez le support.");
      },
    });
  };

  const handleInitiatePayment = async () => {
    if (!selectedOperator || !phone.trim()) return;
    setInitiatingPayment(true);
    setErrorMsg("");
    try {
      const resp = await fetch(`${SENDAVAPAY_CLIENT}/initiate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentToken,
          payerName: user?.username || "Client",
          payerPhone: phone.trim(),
          payerCountry: countryCode,
          operatorId: selectedOperator.id,
        }),
      });
      const json = await resp.json() as any;
      if (!json.success) {
        setErrorMsg(json.message || json.error || "Erreur lors de l'initiation.");
        return;
      }
      if (json.requiresRedirect && json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }
      if (json.requiresOtp && json.otpToken) {
        setOtpToken(json.otpToken);
        setPhase("otp");
        return;
      }
      setPhase("waiting");
      setCheckCount(0);
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (!otp.trim()) return;
    setSubmittingOtp(true);
    setErrorMsg("");
    try {
      const resp = await fetch(`${SENDAVAPAY_CLIENT}/submit-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpToken, otp: otp.trim() }),
      });
      const json = await resp.json() as any;
      if (!json.success) {
        setErrorMsg(json.message || "Code OTP incorrect.");
        return;
      }
      setPhase("waiting");
      setCheckCount(0);
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
    } finally {
      setSubmittingOtp(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    setCheckCount(c => c + 1);
    try {
      const result = await refetchStatus();
      if (result.data?.status === "active") navigate("/dashboard");
    } finally {
      setChecking(false);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setPaymentToken("");
    setReference("");
    setSdkOperators([]);
    setSelectedOperator(null);
    setOtp("");
    setOtpToken("");
    setErrorMsg("");
    setCheckCount(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#0D1B3E] via-[#1565C0] to-[#0D1B3E] p-4 py-8">

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex flex-col items-center"
      >
        <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl mb-3">
          <img src={`${BASE}logo.png`} alt="Nexarix" className="h-14 w-14 object-contain" />
        </div>
        <p className="text-white text-xl font-black tracking-tight">NEXARIX</p>
        <p className="text-blue-200 text-sm mt-1 font-medium tracking-wide">Activation du compte</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">

        {/* Carte montant + avantages */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 leading-tight">Activez votre compte</h2>
                <p className="text-sm text-gray-500">Paiement unique · Accès à vie</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#1565C0] to-[#1E88E5] rounded-2xl p-4 text-center text-white mb-4">
              <p className="text-blue-100 text-xs mb-1">Frais d'activation</p>
              <p className="text-4xl font-black">{activationFee.toLocaleString("fr-FR")}</p>
              <p className="text-blue-200 text-sm font-semibold">{getCurrencyCode(user?.country)} (FCFA)</p>
            </div>

            <div className="space-y-2">
              {BENEFITS.map(b => (
                <div key={b} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Carte paiement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className={`h-1.5 ${paymentMode === "auto" ? "bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />
          <div className="p-6">

            {paymentMode === "auto" ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <h3 className="font-black text-gray-900">Paiement Mobile Money</h3>
                  <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-xl px-2 py-0.5">Automatique</span>
                </div>

                <AnimatePresence mode="wait">
                  {/* Phase: IDLE — bouton démarrer */}
                  {phase === "idle" && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="text-sm text-gray-500 mb-4">
                        Payez directement via Mobile Money. Activation immédiate après confirmation.
                      </p>
                      {errorMsg && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600">{errorMsg}</p>
                        </div>
                      )}
                      <button
                        onClick={handleStartAutoPayment}
                        disabled={initiatePayment.isPending}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:transform-none"
                      >
                        {initiatePayment.isPending
                          ? <><Loader className="h-4 w-4 animate-spin" />Initialisation…</>
                          : <><CreditCard className="h-4 w-4" />Payer {activationFee.toLocaleString("fr-FR")} {getCurrencyCode(user?.country)}</>
                        }
                      </button>
                    </motion.div>
                  )}

                  {/* Phase: SELECTING — choisir opérateur + téléphone */}
                  {phase === "selecting" && (
                    <motion.div key="selecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700">Choisissez votre opérateur Mobile Money :</p>

                      {loadingOperators ? (
                        <div className="flex items-center justify-center gap-2 text-blue-500 py-4">
                          <Loader className="h-5 w-5 animate-spin" />
                          <span className="text-sm">Chargement des opérateurs…</span>
                        </div>
                      ) : sdkOperators.length > 0 ? (
                        <div className="space-y-2">
                          {sdkOperators.map(op => (
                            <button
                              key={op.id}
                              onClick={() => setSelectedOperator(op)}
                              className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-all ${
                                selectedOperator?.id === op.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-100 hover:border-blue-200"
                              }`}
                            >
                              <span className="font-bold text-sm text-gray-800">{op.name}</span>
                              {selectedOperator?.id === op.id && <CheckCircle className="h-4 w-4 text-blue-500" />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-2xl p-3">
                          Aucun opérateur disponible pour votre pays. Contactez le support.
                        </p>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Numéro Mobile Money</label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+228 90 00 00 00"
                            className="w-full h-12 pl-10 pr-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none text-sm font-medium"
                          />
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600">{errorMsg}</p>
                        </div>
                      )}

                      <button
                        onClick={handleInitiatePayment}
                        disabled={!selectedOperator || !phone.trim() || initiatingPayment}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
                      >
                        {initiatingPayment
                          ? <><Loader className="h-4 w-4 animate-spin" />Envoi de la demande…</>
                          : <><Phone className="h-4 w-4" />Confirmer le paiement</>
                        }
                      </button>

                      <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Recommencer
                      </button>
                    </motion.div>
                  )}

                  {/* Phase: OTP */}
                  {phase === "otp" && (
                    <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                        <p className="text-sm font-black text-amber-700 mb-1">Code OTP requis</p>
                        <p className="text-xs text-amber-600">Un code OTP a été envoyé par SMS sur votre téléphone. Saisissez-le ci-dessous.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Code OTP</label>
                        <input
                          type="text"
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          placeholder="123456"
                          maxLength={8}
                          className="w-full h-12 px-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none text-center text-xl font-black tracking-widest"
                        />
                      </div>

                      {errorMsg && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600">{errorMsg}</p>
                        </div>
                      )}

                      <button
                        onClick={handleSubmitOtp}
                        disabled={!otp.trim() || submittingOtp}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {submittingOtp
                          ? <><Loader className="h-4 w-4 animate-spin" />Validation…</>
                          : "Valider le code OTP"
                        }
                      </button>

                      <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Recommencer
                      </button>
                    </motion.div>
                  )}

                  {/* Phase: WAITING — attendre confirmation */}
                  {phase === "waiting" && (
                    <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                          <Loader className="h-5 w-5 animate-spin shrink-0" />
                          <span className="font-black text-sm">En attente de confirmation…</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Confirmez le paiement sur votre téléphone. La vérification est automatique.
                        </p>
                        {checkCount > 0 && (
                          <p className="text-xs text-amber-600 font-semibold mt-2">
                            Vérification {checkCount} — paiement pas encore confirmé.
                          </p>
                        )}
                      </div>

                      <button
                        onClick={handleManualCheck}
                        disabled={checking}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:transform-none"
                      >
                        {checking
                          ? <><Loader className="h-4 w-4 animate-spin" />Vérification en cours…</>
                          : <><RefreshCw className="h-4 w-4" />Vérifier mon paiement</>
                        }
                      </button>

                      <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Recommencer un nouveau paiement
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-black text-gray-900">Instructions de paiement</h3>
                  {user?.country && (
                    <span className="ml-auto text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 rounded-xl px-2 py-0.5">{user.country}</span>
                  )}
                </div>

                {manualOperators.length > 0 ? (
                  <div className="space-y-2">
                    {manualOperators.map(op => (
                      <div key={op.name} className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${op.color}`}>
                        <span className="font-bold text-sm">{op.name}</span>
                        <span className="text-xs opacity-70">Contacter le support</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-3 text-center">
                    Contactez le support pour les instructions.
                  </p>
                )}

                <div className="mt-4 bg-blue-50 rounded-2xl p-3 text-xs text-blue-700 text-center leading-relaxed">
                  Après paiement, envoyez la capture d'écran au support.<br />
                  <span className="font-black">Activation sous 24h.</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Actions bas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex gap-3"
        >
          <button
            onClick={handleLogout}
            className="flex-1 h-11 rounded-2xl bg-white/10 border border-white/30 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
          {paymentMode === "manual" && publicSettings?.telegramLink && (
            <a
              href={publicSettings.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#0088cc] to-[#005580] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Telegram
            </a>
          )}
        </motion.div>

      </div>

      <p className="mt-8 text-blue-300/60 text-xs text-center">© 2025 Nexarix · Tous droits réservés</p>
    </div>
  );
}
