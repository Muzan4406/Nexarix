import { motion } from "framer-motion";
import { useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Trophy, Crown, Users, Star, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyCode } from "@/lib/currency";

const BONUS_STEP = 10;
const BONUS_AMOUNT = 1500;
const MAX_PALIERS = 5;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function EquipeBonus() {
  const { user } = useAuth();
  const { data: downline, isLoading } = useGetDownline();
  const currency = getCurrencyCode(user?.country);

  const level1Count = downline?.level1.length ?? 0;
  const bonusEarned = Math.floor(level1Count / BONUS_STEP);
  const bonusProgress = level1Count % BONUS_STEP;
  const totalBonusAmount = bonusEarned * BONUS_AMOUNT;

  const paliers = Array.from({ length: MAX_PALIERS }, (_, i) => {
    const palierNum = i + 1;
    const required = palierNum * BONUS_STEP;
    const unlocked = level1Count >= required;
    return { palierNum, required, unlocked };
  });

  return (
    <AppLayout>
      <div className="space-y-4 pb-10">

        {/* Hero */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #7c2d12 0%, #c2410c 55%, #ea580c 100%)" }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute top-6 right-28 h-3 w-3 rounded-full bg-yellow-400/40" />
          <div className="pointer-events-none absolute top-14 right-16 h-2 w-2 rounded-full bg-orange-300/50" />

          <div className="relative z-10 p-5 space-y-5">
            {/* Titre */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/20 shrink-0">
                  <Trophy className="h-5 w-5 text-yellow-200" />
                </div>
                <div>
                  <p className="text-orange-200 text-[10px] font-bold uppercase tracking-widest">Programme</p>
                  <p className="text-white font-black text-lg leading-tight">Bonus Super Parrain</p>
                </div>
              </div>
              {bonusEarned > 0 && (
                <div className="shrink-0 bg-white/20 border border-white/25 rounded-xl px-3 py-2 text-center">
                  <Crown className="h-4 w-4 text-yellow-200 mx-auto mb-1" />
                  <p className="text-white font-black text-lg leading-none">{totalBonusAmount.toLocaleString()}</p>
                  <p className="text-orange-200 text-[10px] font-bold">{currency} gagnés</p>
                </div>
              )}
            </div>

            {/* Règle */}
            <div className="rounded-2xl border border-white/15 px-4 py-3" style={{ background: "rgba(255,255,255,0.08)" }}>
              <p className="text-white/90 text-sm font-bold leading-snug">
                Gagnez{" "}
                <span className="text-yellow-300 font-black">{BONUS_AMOUNT.toLocaleString()} {currency}</span>
                {" "}supplémentaires tous les{" "}
                <span className="text-yellow-300 font-black">{BONUS_STEP} filleuls directs</span>
                {" "}actifs (Niveau 1).
              </p>
            </div>

            {/* Progression */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-orange-200" />
                  <p className="text-white/80 text-xs font-semibold">
                    {level1Count} filleul{level1Count > 1 ? "s" : ""} actif{level1Count > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-yellow-200 text-xs font-black">
                  Palier {(bonusEarned + 1) * BONUS_STEP}
                </p>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(bonusProgress / BONUS_STEP) * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-200"
                />
              </div>
              <p className="text-white/65 text-[11px] font-medium text-center">
                Encore{" "}
                <span className="font-black text-yellow-200">{BONUS_STEP - bonusProgress}</span>
                {" "}filleul{BONUS_STEP - bonusProgress > 1 ? "s" : ""} pour débloquer{" "}
                <span className="font-black text-yellow-200">{BONUS_AMOUNT.toLocaleString()} {currency}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Paliers */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
              <Star className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Paliers de bonus</p>
          </div>

          <div className="p-3 space-y-2.5">
            {isLoading ? (
              Array.from({ length: MAX_PALIERS }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
              ))
            ) : (
              paliers.map(({ palierNum, required, unlocked }) => (
                <div
                  key={palierNum}
                  className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3 transition-all ${
                    unlocked
                      ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    unlocked ? "bg-gradient-to-br from-orange-500 to-amber-500" : "bg-gray-200"
                  }`}>
                    {unlocked
                      ? <CheckCircle className="h-4 w-4 text-white" />
                      : <Lock className="h-4 w-4 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-black ${unlocked ? "text-orange-900" : "text-gray-400"}`}>
                      Palier {palierNum} — {required} filleuls
                    </p>
                    <p className={`text-xs font-semibold ${unlocked ? "text-orange-600" : "text-gray-400"}`}>
                      {unlocked ? "Débloqué ✓" : `Encore ${Math.max(0, required - level1Count)} filleul${required - level1Count > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className={`text-right shrink-0 ${unlocked ? "" : "opacity-40"}`}>
                    <p className={`font-black text-base ${unlocked ? "text-orange-700" : "text-gray-400"}`}>
                      +{BONUS_AMOUNT.toLocaleString()}
                    </p>
                    <p className={`text-[10px] font-bold ${unlocked ? "text-orange-500" : "text-gray-400"}`}>
                      {currency}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Résumé total */}
        {bonusEarned > 0 && (
          <motion.div
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-4"
          >
            <div className="flex items-center gap-2.5">
              <Crown className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-black text-orange-900">Total bonus Super Parrain</p>
                <p className="text-xs text-orange-600 font-semibold">{bonusEarned} palier{bonusEarned > 1 ? "s" : ""} débloqué{bonusEarned > 1 ? "s" : ""}</p>
              </div>
            </div>
            <p className="font-black text-xl text-orange-700">
              {totalBonusAmount.toLocaleString()} <span className="text-sm">{currency}</span>
            </p>
          </motion.div>
        )}

      </div>
    </AppLayout>
  );
}
