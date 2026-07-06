import { motion } from "framer-motion";
import { useGetDashboard, useConvertPoints, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { Zap, Star, TrendingUp, ArrowRight, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencyCode } from "@/lib/currency";

const rise = (i: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
});

export default function Points() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
  const convertPoints = useConvertPoints();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConvert = () => {
    convertPoints.mutate(undefined, {
      onSuccess: (res: any) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "✅ Conversion réussie !", description: `${res.pointsConverted} pts → ${formatCurrency(res.fcfaAdded, user?.country)}` });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Minimum 1 000 points requis", variant: "destructive" });
      },
    });
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-amber-400 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const points       = stats?.points || 0;
  const canConvert   = points >= 1000;
  const setsOf1000   = Math.floor(points / 1000);
  const estimatedFcfa = setsOf1000 * 500;
  const remaining    = 1000 - (points % 1000);
  const progress     = Math.min((points % 1000) / 1000 * 100, 100);
  const currency     = getCurrencyCode(user?.country);

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">

        {/* ── Hero ─────────────────────────────── */}
        <motion.div
          variants={rise(0)} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-[28px] text-white"
          style={{ background: "linear-gradient(145deg, #431407 0%, #9a3412 45%, #ea580c 100%)" }}
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 65%)" }} />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute top-6 right-20 h-2.5 w-2.5 rounded-full bg-yellow-300/60" />
          <div className="pointer-events-none absolute top-14 right-10 h-1.5 w-1.5 rounded-full bg-orange-200/50" />

          <div className="relative z-10 p-5">
            {/* Titre */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-[16px] bg-white/15 flex items-center justify-center border border-white/10">
                <Star className="h-5 w-5 text-yellow-200" />
              </div>
              <div>
                <p className="text-orange-200/70 text-[10px] font-semibold uppercase tracking-[0.12em]">Programme</p>
                <p className="font-black text-[17px] leading-tight">Mes Points</p>
              </div>
            </div>

            {/* Gros compteur */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="mb-5"
            >
              <p className="font-black leading-none tracking-tight" style={{ fontSize: "clamp(44px, 14vw, 60px)" }}>
                {points.toLocaleString()}
              </p>
              <p className="text-orange-200/80 text-[12px] font-medium mt-1">points disponibles</p>
            </motion.div>

            {/* Progression / statut */}
            {canConvert ? (
              <div className="rounded-2xl p-3.5 border border-white/12" style={{ background: "rgba(255,255,255,0.10)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-yellow-300 shrink-0" />
                  <p className="font-bold text-[13px]">Prêt à convertir !</p>
                </div>
                <p className="text-orange-200/80 text-[11px]">
                  {(setsOf1000 * 1000).toLocaleString()} pts → <span className="font-black text-white">{formatCurrency(estimatedFcfa, user?.country)}</span>
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <span className="text-orange-200/80 font-semibold">Progression vers conversion</span>
                  <span className="text-yellow-200 font-bold">{points % 1000} / 1 000 pts</span>
                </div>
                <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #fde68a, #fbbf24)" }}
                  />
                </div>
                <p className="text-orange-200/70 text-[10px] font-medium mt-1.5">
                  Encore <span className="font-black text-yellow-200">{remaining}</span> pts
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Taux de conversion ───────────────── */}
        <motion.div
          variants={rise(1)} initial="hidden" animate="visible"
          className="bg-white rounded-[24px] border border-gray-100/80 shadow-sm overflow-hidden"
        >
          <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #f59e0b, #ea580c)" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <h2 className="font-black text-gray-900 text-[14px]">Taux de conversion</h2>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[14px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-[15px]">1 000 pts</p>
                  <p className="text-[10px] text-gray-500 font-medium">minimum requis</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
              <div className="text-right">
                <p className="font-black text-emerald-600 text-[18px]">500 {currency}</p>
                <p className="text-[10px] text-gray-500 font-medium">ajoutés au solde</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center font-medium">
              Les points restants (hors multiples de 1 000) sont conservés.
            </p>
          </div>
        </motion.div>

        {/* ── Bouton conversion ────────────────── */}
        <motion.div variants={rise(2)} initial="hidden" animate="visible">
          <button
            onClick={handleConvert}
            disabled={convertPoints.isPending || !canConvert}
            className={`w-full rounded-[20px] h-14 flex items-center justify-center gap-2.5 font-black text-[15px] transition-all shadow-lg ${
              canConvert && !convertPoints.isPending
                ? "text-white shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
            }`}
            style={canConvert && !convertPoints.isPending
              ? { background: "linear-gradient(135deg, #f59e0b, #ea580c)" }
              : {}
            }
          >
            {convertPoints.isPending ? (
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : canConvert ? (
              <><Zap className="h-5 w-5" /> Convertir {(setsOf1000 * 1000).toLocaleString()} pts → {formatCurrency(estimatedFcfa, user?.country)}</>
            ) : (
              <><Lock className="h-5 w-5" /> Minimum 1 000 pts requis</>
            )}
          </button>
          {!canConvert && (
            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium">
              Il vous manque <span className="font-black text-gray-600">{remaining.toLocaleString()}</span> points pour convertir
            </p>
          )}
        </motion.div>

      </div>
    </AppLayout>
  );
}
