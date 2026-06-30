import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap, Play, FileText, Clock, BookOpen, Tag,
  X, CreditCard, Globe, Smartphone, ChevronDown, Loader,
  CheckCircle, CheckCircle2, AlertCircle, RotateCcw, RefreshCw, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SENDAVAPAY_CLIENT = "https://sendavapay.com/api/sdk/v1";

const COUNTRY_ISO: Record<string, string> = {
  "Togo": "TG", "Bénin": "BJ", "Côte d'Ivoire": "CI",
  "Cameroun": "CM", "Burkina Faso": "BF", "Mali": "ML",
  "Niger": "NE", "Sénégal": "SN", "Guinée": "GN",
  "Gabon": "GA", "Tchad": "TD", "Congo": "COG",
  "République centrafricaine": "CF", "Guinée Équatoriale": "GQ", "RD Congo": "COD",
};
const COUNTRY_LIST = Object.keys(COUNTRY_ISO).sort();

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  debutant:      { label: "Débutant",      color: "bg-emerald-100 text-emerald-600" },
  intermediaire: { label: "Intermédiaire", color: "bg-amber-100 text-amber-600" },
  avance:        { label: "Avancé",        color: "bg-red-100 text-red-600" },
};

const CAT_GRADIENT: Record<string, string> = {
  general:   "from-orange-500 to-amber-500",
  marketing: "from-blue-500 to-cyan-500",
  finance:   "from-emerald-500 to-teal-500",
  technique: "from-violet-500 to-purple-500",
};

const card = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

type PayPhase = "form" | "initiating" | "otp" | "waiting" | "success";
interface SdkOperator { id: string; name: string; requiresOtp: boolean; status: string }

function useFormations(token: string | null) {
  return useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const res = await fetch("/api/formations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    enabled: !!token,
  });
}

function useMyPurchases(token: string | null) {
  return useQuery({
    queryKey: ["my-formation-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/formations/my-purchases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { purchasedIds: [] };
      return res.json();
    },
    enabled: !!token,
  });
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
interface PayModalProps {
  formation: any;
  token: string;
  user: any;
  onClose: () => void;
  onSuccess: (formationId: number) => void;
}

function PayModal({ formation, token, user, onClose, onSuccess }: PayModalProps) {
  const [phase, setPhase] = useState<PayPhase>("form");
  const [country, setCountry] = useState(user?.country || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [operators, setOperators] = useState<SdkOperator[]>([]);
  const [selectedOp, setSelectedOp] = useState<SdkOperator | null>(null);
  const [loadingOps, setLoadingOps] = useState(false);
  const [opsLoaded, setOpsLoaded] = useState(false);
  const [paymentToken, setPaymentToken] = useState("");
  const [reference, setReference] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const countryCode = COUNTRY_ISO[country] || "";
  const price = formation.price;

  // Load operators on country change
  useEffect(() => {
    if (!countryCode) { setOperators([]); setSelectedOp(null); setOpsLoaded(false); return; }
    let cancelled = false;
    setLoadingOps(true);
    setSelectedOp(null);
    setOpsLoaded(false);
    fetch(`${SENDAVAPAY_CLIENT}/operators/${countryCode}`)
      .then(r => r.json())
      .then((json: any) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) {
          setOperators(json.data.filter((op: SdkOperator) => op.status === "online"));
        } else {
          setOperators([]);
        }
        setOpsLoaded(true);
      })
      .catch(() => { if (!cancelled) { setOperators([]); setOpsLoaded(true); } })
      .finally(() => { if (!cancelled) setLoadingOps(false); });
    return () => { cancelled = true; };
  }, [countryCode]);

  // Polling in waiting phase
  useEffect(() => {
    if (phase !== "waiting") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(() => checkStatus(reference), 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [phase, reference]);

  const checkStatus = async (ref: string) => {
    try {
      const qs = ref ? `?reference=${encodeURIComponent(ref)}` : "";
      const res = await fetch(`/api/formations/${formation.id}/purchase/status${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.status === "completed") {
        setPhase("success");
        onSuccess(formation.id);
      }
    } catch (_) {}
  };

  const handlePay = async () => {
    if (!country || !phone.trim() || !selectedOp) return;
    setErrorMsg("");
    setPhase("initiating");
    try {
      const initRes = await fetch(`/api/formations/${formation.id}/purchase/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country, phone: phone.trim() }),
      });
      const initJson = await initRes.json() as any;
      if (!initRes.ok) {
        setErrorMsg(initJson?.error || "Erreur Sendavapay. Réessayez.");
        setPhase("form");
        return;
      }
      const { paymentToken: pt, reference: ref } = initJson;
      setPaymentToken(pt);
      setReference(ref);

      const sdkRes = await fetch(`${SENDAVAPAY_CLIENT}/initiate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentToken: pt,
          payerName: user?.username || "Client",
          payerPhone: phone.trim(),
          payerCountry: countryCode,
          operatorId: selectedOp.id,
        }),
      });
      const sdkJson = await sdkRes.json() as any;
      if (!sdkJson.success) {
        setErrorMsg(sdkJson.message || sdkJson.error || "Erreur Mobile Money.");
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
    } catch (_) {
      setErrorMsg("Erreur réseau. Réessayez.");
      setPhase("form");
    }
  };

  const handleSubmitOtp = async () => {
    if (!otp.trim()) return;
    setSubmittingOtp(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${SENDAVAPAY_CLIENT}/submit-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpToken, otp: otp.trim() }),
      });
      const json = await res.json() as any;
      if (!json.success) { setErrorMsg(json.message || "Code OTP incorrect."); return; }
      setPhase("waiting");
    } catch (_) {
      setErrorMsg("Erreur réseau. Réessayez.");
    } finally {
      setSubmittingOtp(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    await checkStatus(reference);
    setChecking(false);
  };

  const handleReset = () => {
    setPhase("form");
    setPaymentToken(""); setReference(""); setOtpToken("");
    setOtp(""); setErrorMsg("");
  };

  const canPay = country && phone.trim().length >= 8 && selectedOp && !loadingOps;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-white/20 rounded-2xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight line-clamp-1">{formation.title}</p>
              <p className="text-emerald-100 text-xs">Paiement Mobile Money</p>
            </div>
          </div>
          <div className="mt-3 bg-white/15 rounded-2xl px-4 py-2.5 text-center">
            <p className="text-emerald-100 text-[10px] font-semibold">Montant à payer</p>
            <p className="text-white text-2xl font-black">{parseFloat(price).toLocaleString("fr-FR")} FCFA</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* FORM / INITIATING */}
            {(phase === "form" || phase === "initiating") && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* Pays */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> Votre pays
                  </label>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={e => { setCountry(e.target.value); setSelectedOp(null); }}
                      disabled={phase === "initiating"}
                      className="w-full h-11 pl-4 pr-10 rounded-2xl border-2 border-gray-100 focus:border-emerald-400 focus:outline-none text-sm font-semibold text-gray-800 bg-white appearance-none"
                    >
                      <option value="">— Sélectionner votre pays —</option>
                      {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" /> Numéro Mobile Money
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+228 90 00 00 00"
                    disabled={phase === "initiating"}
                    className="w-full h-11 px-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-400 focus:outline-none text-sm font-medium"
                  />
                </div>

                {/* Opérateurs */}
                {country && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Opérateur</label>
                    {loadingOps ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-500 py-3">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Chargement…</span>
                      </div>
                    ) : opsLoaded && operators.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                        <p className="text-xs text-amber-700 font-semibold">Aucun opérateur disponible.</p>
                        <p className="text-xs text-amber-600 mt-0.5">Contactez le support.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {operators.map(op => (
                          <button
                            key={op.id}
                            onClick={() => setSelectedOp(op)}
                            disabled={phase === "initiating"}
                            className={cn(
                              "w-full flex items-center justify-between rounded-2xl px-4 py-2.5 border-2 transition-all text-sm font-bold",
                              selectedOp?.id === op.id
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-gray-100 hover:border-emerald-200 text-gray-700"
                            )}
                          >
                            {op.name}
                            {selectedOp?.id === op.id && <CheckCircle className="h-4 w-4 text-emerald-500" />}
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
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none"
                >
                  {phase === "initiating"
                    ? <><Loader className="h-4 w-4 animate-spin" />Initialisation…</>
                    : <><CreditCard className="h-4 w-4" />Payer {parseFloat(price).toLocaleString("fr-FR")} FCFA</>
                  }
                </button>

                <p className="text-center text-[10px] text-gray-400 font-medium">
                  🔒 Paiement sécurisé via Sendavapay
                </p>
              </motion.div>
            )}

            {/* OTP */}
            {phase === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black text-amber-700 mb-1">Code OTP requis</p>
                  <p className="text-xs text-amber-600">
                    Un code a été envoyé par SMS sur <span className="font-bold">{phone}</span>.
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
                    className="w-full h-14 px-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-400 focus:outline-none text-center text-2xl font-black tracking-widest"
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
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {submittingOtp ? <><Loader className="h-4 w-4 animate-spin" />Validation…</> : "Valider le code OTP"}
                </button>
                <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> Recommencer
                </button>
              </motion.div>
            )}

            {/* WAITING */}
            {phase === "waiting" && (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
                    <Loader className="h-5 w-5 animate-spin shrink-0" />
                    <span className="font-black text-sm">En attente de confirmation…</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Confirmez le paiement sur votre téléphone ({selectedOp?.name}).
                  </p>
                </div>
                <button
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:transform-none"
                >
                  {checking
                    ? <><Loader className="h-4 w-4 animate-spin" />Vérification…</>
                    : <><RefreshCw className="h-4 w-4" />Vérifier mon paiement</>
                  }
                </button>
                <button onClick={handleReset} className="w-full h-10 rounded-2xl text-gray-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> Recommencer
                </button>
              </motion.div>
            )}

            {/* SUCCESS */}
            {phase === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-4 space-y-4">
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg">Achat confirmé !</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Vous avez maintenant accès à <span className="font-bold text-gray-700">{formation.title}</span>.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black shadow-lg"
                >
                  Accéder à la formation
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Formations() {
  const { token, user } = useAuth() as any;
  const { data: formations, isLoading } = useFormations(token);
  const { data: purchasesData, refetch: refetchPurchases } = useMyPurchases(token);
  const [filter, setFilter] = useState("all");
  const [payingFormation, setPayingFormation] = useState<any>(null);

  const purchasedIds: number[] = purchasesData?.purchasedIds || [];

  const categories = ["all", ...Array.from(new Set((formations || []).map((f: any) => f.category)))];
  const filtered = filter === "all" ? (formations || []) : (formations || []).filter((f: any) => f.category === filter);

  const handlePaySuccess = (formationId: number) => {
    refetchPurchases();
    setTimeout(() => setPayingFormation(null), 2500);
  };

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200">
            <GraduationCap className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-xl leading-tight">Formations</h1>
            <p className="text-xs text-gray-400 font-medium">Apprenez et progressez</p>
          </div>
        </div>

        {/* Filters */}
        {!isLoading && categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  filter === cat
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
                )}
              >
                {cat === "all" ? "Tout" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Formations list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-9 w-9 text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-lg mb-1">Aucune formation disponible</p>
            <p className="text-sm text-gray-400">De nouvelles formations arrivent bientôt !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((formation: any, i: number) => {
              const gradient = CAT_GRADIENT[formation.category] || CAT_GRADIENT.general;
              const levelCfg = LEVEL_CONFIG[formation.level] || { label: formation.level, color: "bg-gray-100 text-gray-500" };
              const hasPurchased = purchasedIds.includes(formation.id);
              const isPaid = !formation.isFree && formation.price && formation.price > 0;
              const isLocked = isPaid && !hasPurchased;

              return (
                <motion.div
                  key={formation.id}
                  custom={i}
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Thumbnail */}
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md overflow-hidden relative",
                      formation.thumbnailUrl ? "" : `bg-gradient-to-br ${gradient}`
                    )}>
                      {formation.thumbnailUrl
                        ? <img src={formation.thumbnailUrl} alt={formation.title} className="h-full w-full object-cover" />
                        : <GraduationCap className="h-7 w-7 text-white" />
                      }
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                          <Lock className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{formation.title}</p>
                          {formation.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{formation.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg", levelCfg.color)}>
                              {levelCfg.label}
                            </span>
                            {formation.duration && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                <Clock className="h-3 w-3" />{formation.duration}
                              </span>
                            )}
                            {formation.isFree ? (
                              <span className="text-[10px] font-black text-emerald-500">GRATUIT</span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-500">PREMIUM</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex gap-2 flex-wrap">

                        {/* Paid formation — show Pay or Purchased */}
                        {isPaid && (
                          hasPurchased ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              Acheté
                            </span>
                          ) : (
                            <button
                              onClick={() => setPayingFormation(formation)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                            >
                              <Tag className="h-3 w-3" />
                              {parseFloat(String(formation.price)).toLocaleString("fr-FR")} FCFA
                            </button>
                          )
                        )}

                        {/* Content buttons — visible if free OR purchased */}
                        {(!isLocked) && (
                          <>
                            {formation.videoUrl && (
                              <a
                                href={formation.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm hover:shadow-md transition-all"
                              >
                                <Play className="h-3 w-3" />
                                Vidéo
                              </a>
                            )}
                            {formation.contentUrl && (
                              <a
                                href={formation.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:shadow-md transition-all"
                              >
                                <FileText className="h-3 w-3" />
                                Document
                              </a>
                            )}
                            {!formation.videoUrl && !formation.contentUrl && !isPaid && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400">
                                Bientôt disponible
                              </span>
                            )}
                          </>
                        )}

                        {/* Locked overlay message */}
                        {isLocked && !formation.price && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-400">
                            <Lock className="h-3 w-3" />
                            Contenu verrouillé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment modal */}
      <AnimatePresence>
        {payingFormation && token && (
          <PayModal
            formation={payingFormation}
            token={token}
            user={user}
            onClose={() => setPayingFormation(null)}
            onSuccess={handlePaySuccess}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
