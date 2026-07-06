import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPublicSettings, useCheckActivationStatus } from "@workspace/api-client-react";
import {
  Zap, CheckCircle2, CreditCard, Loader,
  RefreshCw, RotateCcw, Smartphone, AlertCircle, Globe, ChevronDown, PartyPopper,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { getCurrencyCode } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;
const SENDAVAPAY_CLIENT = "https://sendavapay.com/api/sdk/v1";

const COUNTRY_ISO: Record<string, string> = {
  "Togo": "TG", "Bénin": "BJ", "Côte d'Ivoire": "CI",
  "Cameroun": "CM", "Burkina Faso": "BF", "Mali": "ML",
  "Niger": "NE", "Sénégal": "SN", "Guinée": "GN",
  "Gabon": "GA", "Tchad": "TD", "Congo": "COG",
  "République centrafricaine": "CF", "Guinée Équatoriale": "GQ", "RD Congo": "COD",
};

const COUNTRY_LIST = Object.keys(COUNTRY_ISO).sort();


type Phase = "form" | "initiating" | "otp" | "waiting" | "success";

interface SdkOperator { id: string; name: string; requiresOtp: boolean; status: string }

export default function Activate() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: publicSettings } = useGetPublicSettings();
  const { data: activationStatus } = useCheckActivationStatus();

  const [phase, setPhase] = useState<Phase>("form");

  // Form fields
  const [country, setCountry] = useState(user?.country || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [sdkOperators, setSdkOperators] = useState<SdkOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<SdkOperator | null>(null);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [operatorsLoaded, setOperatorsLoaded] = useState(false);

  // Payment state
  const [paymentToken, setPaymentToken] = useState("");
  const [reference, setReference] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [submittingOtp, setSubmittingOtp] = useState(false);

  const paymentMode = publicSettings?.paymentMode ?? "manual";
  const activationFee = publicSettings?.activationFee ?? 3000;
  const countryCode = COUNTRY_ISO[country] || "";

  useEffect(() => {
    if (activationStatus?.status === "active") setPhase("success");
  }, [activationStatus]);

  useEffect(() => {
    if (user?.country && !country) setCountry(user.country);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]);

  // Direct check with reference (bypasses React Query cache, sends reference to server)
  const checkWithReference = async (ref: string): Promise<boolean> => {
    try {
      const qs = ref ? `?reference=${encodeURIComponent(ref)}` : "";
      const token = localStorage.getItem("nexarix_token");
      const resp = await fetch(`/api/activate/check${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await resp.json();
      if (json?.status === "active") {
        setPhase("success");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Auto-redirect 3 seconds after success screen
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => { window.location.href = `${BASE}dashboard`; }, 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Load operators when country changes (auto mode only)
  useEffect(() => {
    if (paymentMode !== "auto" || !countryCode) {
      setSdkOperators([]);
      setSelectedOperator(null);
      setOperatorsLoaded(false);
      return;
    }
    let cancelled = false;
    setLoadingOperators(true);
    setSelectedOperator(null);
    setOperatorsLoaded(false);
    fetch(`${SENDAVAPAY_CLIENT}/operators/${countryCode}`)
      .then(r => r.json())
      .then((json: any) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) {
          setSdkOperators(json.data.filter((op: SdkOperator) => op.status === "online"));
        } else {
          setSdkOperators([]);
        }
        setOperatorsLoaded(true);
      })
      .catch(() => { if (!cancelled) { setSdkOperators([]); setOperatorsLoaded(true); } })
      .finally(() => { if (!cancelled) setLoadingOperators(false); });
    return () => { cancelled = true; };
  }, [countryCode, paymentMode]);

  // Polling in waiting phase — sends reference so server can verify with Sendavapay
  useEffect(() => {
    if (phase !== "waiting") return;
    const interval = setInterval(() => { checkWithReference(reference); }, 5000);
    return () => clearInterval(interval);
  }, [phase, reference]);

  const handlePay = async () => {
    if (!country || !phone.trim() || !selectedOperator) return;
    setErrorMsg("");
    setPhase("initiating");

    // Step 1 — server creates Sendavapay payment, we pass country + phone from form
    try {
      const token = localStorage.getItem("nexarix_token");
      const initResp = await fetch("/api/activate/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ country, phone: phone.trim() }),
      });
      const initJson = await initResp.json() as any;
      if (!initResp.ok) {
        setErrorMsg(initJson?.error || "Erreur Sendavapay. Vérifiez la configuration.");
        setPhase("form");
        return;
      }
      const { paymentToken: pt, reference: ref } = initJson;
      setPaymentToken(pt);
      setReference(ref);

      // Step 2 — frontend calls Sendavapay CORS endpoint to initiate the Mobile Money prompt
      const sdkResp = await fetch(`${SENDAVAPAY_CLIENT}/initiate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentToken: pt,
          payerName: user?.username || "Client",
          payerPhone: phone.trim(),
          payerCountry: countryCode,
          operatorId: selectedOperator.id,
        }),
      });
      const sdkJson = await sdkResp.json() as any;
      if (!sdkJson.success) {
        setErrorMsg(sdkJson.message || sdkJson.error || "Erreur lors de l'initiation Mobile Money.");
        setPhase("form");
        return;
      }
      if (sdkJson.requiresRedirect && sdkJson.redirectUrl) {
        window.location.href = sdkJson.redirectUrl;
        return;
      }
      if (sdkJson.requiresOtp && sdkJson.otpToken) {
        setOtpToken(sdkJson.otpToken);
        setPhase("otp");
        return;
      }
      setPhase("waiting");
      setCheckCount(0);
    } catch (e: any) {
      setErrorMsg("Erreur réseau. Réessayez.");
      setPhase("form");
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
      if (!json.success) { setErrorMsg(json.message || "Code OTP incorrect."); return; }
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
      const isActive = await checkWithReference(reference);
      if (isActive) navigate("/dashboard");
    } finally {
      setChecking(false);
    }
  };

  const handleReset = () => {
    setPhase("form");
    setPaymentToken("");
    setReference("");
    setOtpToken("");
    setOtp("");
    setErrorMsg("");
    setCheckCount(0);
  };

  const canPay = country && phone.trim().length >= 8 && selectedOperator && !loadingOperators;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#0D1B3E] via-[#1565C0] to-[#0D1B3E] p-4 py-8">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="mb-6 flex flex-col items-center"
      >
        <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl mb-3">
          <img src={`${BASE}logo.png`} alt="Nexarix" className="h-14 w-14 object-contain" />
        </div>
        <p className="text-white text-xl font-black tracking-tight">NEXARIX</p>
        <p className="text-blue-200 text-sm mt-1 font-medium tracking-wide">Activation du compte</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">

        {/* Carte montant */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 leading-tight">Activez votre compte</h2>
                <p className="text-xs text-gray-400">Paiement unique · Accès à vie</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#1565C0] to-[#1E88E5] rounded-2xl p-4 text-center text-white">
              <p className="text-blue-200 text-xs mb-1 font-medium">Frais d'activation</p>
              <p className="text-4xl font-black">{activationFee.toLocaleString("fr-FR")}</p>
              <p className="text-blue-200 text-sm font-semibold mt-0.5">{getCurrencyCode(country || user?.country)} (FCFA)</p>
            </div>
          </div>
        </motion.div>

        {/* Carte paiement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className={`h-1.5 ${paymentMode === "auto" ? "bg-gradient-to-r from-[#1565C0] to-[#1E88E5]" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`} />
          <div className="p-6">

            {paymentMode === "auto" ? (
              <AnimatePresence mode="wait">

                {/* ── FORM ── */}
                {(phase === "form" || phase === "initiating") && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      <h3 className="font-black text-gray-900">Paiement Mobile Money</h3>
                      <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-xl px-2 py-0.5">Automatique</span>
                    </div>

                    {/* Pays */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />Votre pays
                      </label>
                      <div className="relative">
                        <select
                          value={country}
                          onChange={e => { setCountry(e.target.value); setSelectedOperator(null); }}
                          className="w-full h-12 pl-4 pr-10 rounded-2xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none text-sm font-semibold text-gray-800 bg-white appearance-none"
                          disabled={phase === "initiating"}
                        >
                          <option value="">— Sélectionner votre pays —</option>
                          {COUNTRY_LIST.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Téléphone */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5" />Numéro Mobile Money
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+228 90 00 00 00"
                        disabled={phase === "initiating"}
                        className="w-full h-12 px-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none text-sm font-medium"
                      />
                    </div>

                    {/* Opérateurs */}
                    {country && (
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Opérateur Mobile Money</label>
                        {loadingOperators ? (
                          <div className="flex items-center justify-center gap-2 text-blue-500 py-4">
                            <Loader className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Chargement…</span>
                          </div>
                        ) : operatorsLoaded && sdkOperators.length === 0 ? (
                          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                            <p className="text-xs text-amber-700 font-semibold">Aucun opérateur disponible pour ce pays.</p>
                            <p className="text-xs text-amber-600 mt-0.5">Contactez le support.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sdkOperators.map(op => (
                              <button
                                key={op.id}
                                onClick={() => setSelectedOperator(op)}
                                disabled={phase === "initiating"}
                                className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-all ${
                                  selectedOperator?.id === op.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-100 hover:border-blue-200 bg-white"
                                }`}
                              >
                                <span className="font-bold text-sm text-gray-800">{op.name}</span>
                                {selectedOperator?.id === op.id && <CheckCircle className="h-4 w-4 text-blue-500" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {errorMsg && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{errorMsg}</p>
                      </div>
                    )}

                    <button
                      onClick={handlePay}
                      disabled={!canPay || phase === "initiating"}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none"
                    >
                      {phase === "initiating"
                        ? <><Loader className="h-4 w-4 animate-spin" />Initialisation du paiement…</>
                        : <><CreditCard className="h-4 w-4" />Payer {activationFee.toLocaleString("fr-FR")} {getCurrencyCode(country || user?.country)}</>
                      }
                    </button>

                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-[11px] text-gray-400 font-medium">Paiement sécurisé via Sendavapay</p>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <a
                        href={publicSettings?.telegramLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 rounded-2xl border-2 border-green-200 bg-green-50 text-green-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                      >
                        <SiWhatsapp className="h-4 w-4" />
                        Besoin d'aide ? Support WhatsApp
                      </a>
                    </div>
                  </motion.div>
                )}

                {/* ── OTP ── */}
                {phase === "otp" && (
                  <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                      <p className="text-sm font-black text-amber-700 mb-1">Code OTP requis</p>
                      <p className="text-xs text-amber-600">
                        Un code OTP a été envoyé par SMS sur <span className="font-bold">{phone}</span>.
                        Saisissez-le ci-dessous.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">Code OTP</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={8}
                        autoFocus
                        className="w-full h-14 px-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 focus:outline-none text-center text-2xl font-black tracking-widest"
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
                      <RotateCcw className="h-3.5 w-3.5" />Recommencer
                    </button>
                  </motion.div>
                )}

                {/* ── WAITING ── */}
                {phase === "waiting" && (
                  <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                        <Loader className="h-5 w-5 animate-spin shrink-0" />
                        <span className="font-black text-sm">En attente de confirmation…</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Confirmez le paiement sur votre téléphone (<span className="font-bold">{selectedOperator?.name}</span>).
                        La vérification est automatique.
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
                        ? <><Loader className="h-4 w-4 animate-spin" />Vérification…</>
                        : <><RefreshCw className="h-4 w-4" />Vérifier mon paiement</>
                      }
                    </button>

                    <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />Recommencer un nouveau paiement
                    </button>
                  </motion.div>
                )}

                {/* ── SUCCESS ── */}
                {phase === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    className="text-center py-2 space-y-5"
                  >
                    {/* Icône animée */}
                    <div className="flex justify-center">
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
                        className="relative"
                      >
                        <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.45, duration: 0.35, type: "spring" }}
                          className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg"
                        >
                          <PartyPopper className="h-4 w-4 text-white" />
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Texte */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <p className="text-xl font-black text-gray-900">Compte activé ! 🎉</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Bienvenue sur Nexarix. Vous allez être redirigé vers votre tableau de bord…
                      </p>
                    </motion.div>

                    {/* Barre de progression */}
                    <motion.div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "linear" }}
                      />
                    </motion.div>

                    <button
                      onClick={() => { window.location.href = `${BASE}dashboard`; }}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accéder au tableau de bord
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>

            ) : (
              /* ── MODE MANUEL ── */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <SiWhatsapp className="h-5 w-5 text-green-500" />
                  <h3 className="font-black text-gray-900">Paiement via WhatsApp</h3>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-600 mb-1 uppercase tracking-wide">Montant à envoyer</p>
                  <p className="text-3xl font-black text-amber-700">{activationFee.toLocaleString("fr-FR")} FCFA</p>
                </div>

                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                  {[
                    "Effectuez le dépôt Mobile Money",
                    "Prenez une capture d'écran de la confirmation",
                    "Envoyez-la au support WhatsApp ci-dessous",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-green-100 text-green-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-gray-600 font-medium">{step}</p>
                    </div>
                  ))}
                </div>

                <a
                  href={publicSettings?.telegramLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black flex items-center justify-center gap-2.5 shadow-lg shadow-green-200 hover:-translate-y-0.5 active:translate-y-0 transition-all py-3"
                >
                  <SiWhatsapp className="h-5 w-5" />
                  Contacter le support WhatsApp
                </a>
              </div>
            )}

          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          <button onClick={() => { logout(); navigate("/"); }} className="text-blue-200 text-xs font-semibold hover:text-white transition-colors">
            Se déconnecter
          </button>
        </motion.div>

      </div>
    </div>
  );
}
