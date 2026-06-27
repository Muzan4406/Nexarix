import { motion } from "framer-motion";
import { useGetDashboard, useConvertPoints, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { Zap, Star, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

function formatFcfa(amount: number) { return `${amount.toLocaleString("fr-FR")} XOF`; }

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Points() {
  const { data: stats, isLoading } = useGetDashboard();
  const convertPoints = useConvertPoints();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleConvert = () => {
    convertPoints.mutate(undefined, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "✅ Conversion réussie !", description: `${res.pointsConverted} pts → ${formatFcfa(res.fcfaAdded)}` });
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.data?.error || "Minimum 1 000 points requis", variant: "destructive" });
      },
    });
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const points = stats?.points || 0;
  const canConvert = points >= 1000;
  const setsOf1000 = Math.floor(points / 1000);
  const estimatedFcfa = setsOf1000 * 500;
  const remaining = 1000 - (points % 1000);
  const progress = Math.min((points % 1000) / 1000 * 100, 100);

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero solde */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white relative overflow-hidden shadow-xl shadow-amber-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute top-6 right-20 h-5 w-5 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Star className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">Solde Points</p>
                <p className="font-black text-2xl leading-tight">Mes Points</p>
              </div>
            </div>
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl font-black mb-1"
            >
              {points.toLocaleString()}
            </motion.p>
            <p className="text-amber-100 font-semibold mb-4">points disponibles</p>

            {canConvert ? (
              <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-200 shrink-0" />
                  <p className="text-sm font-bold">Convertissable maintenant !</p>
                </div>
                <p className="text-amber-100 text-xs mt-1">
                  {(setsOf1000 * 1000).toLocaleString()} pts → {formatFcfa(estimatedFcfa)}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-amber-100 font-semibold">Progrès vers conversion</span>
                  <span className="text-amber-200 font-bold">{points % 1000}/1 000 pts</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
                <p className="text-amber-100 text-xs mt-1.5">Encore {remaining} pts avant conversion</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Taux de conversion */}
        <motion.div
          custom={0} variants={item} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-black text-gray-900">Taux de conversion</h2>
          </div>
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900">1 000 points</p>
                <p className="text-xs text-gray-500">minimum requis</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className="text-right">
              <p className="font-black text-emerald-600 text-lg">500 XOF</p>
              <p className="text-xs text-gray-500">sur votre solde</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Les points non multiples de 1 000 sont conservés après conversion.
          </p>
        </motion.div>

        {/* Bouton conversion */}
        <motion.div custom={1} variants={item} initial="hidden" animate="visible">
          <button
            onClick={handleConvert}
            disabled={convertPoints.isPending || !canConvert}
            className={`w-full rounded-2xl h-14 flex items-center justify-center gap-3 font-black text-base transition-all shadow-lg ${
              canConvert && !convertPoints.isPending
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200 hover:shadow-amber-300 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
            }`}
          >
            <Zap className="h-5 w-5" />
            {convertPoints.isPending
              ? "Conversion en cours…"
              : canConvert
                ? `Convertir ${(setsOf1000 * 1000).toLocaleString()} pts → ${formatFcfa(estimatedFcfa)}`
                : `Minimum 1 000 pts requis`
            }
          </button>
          {!canConvert && (
            <p className="text-xs text-center text-gray-400 mt-2 font-semibold">
              Il vous manque encore {remaining.toLocaleString()} points
            </p>
          )}
        </motion.div>

      </div>
    </AppLayout>
  );
}
