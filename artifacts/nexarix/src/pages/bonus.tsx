import { motion } from "framer-motion";
import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Gift, CheckCircle, TrendingUp, Users, Zap, Star, Crown } from "lucide-react";

function formatFcfa(v: number) { return `${v.toLocaleString("fr-FR")} XOF`; }

const MLM_LEVELS = [
  { level: "Niveau 1", label: "Parrain direct", amount: 1300, gradient: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-200" },
  { level: "Niveau 2", label: "Parrain du Niv. 1", amount: 700, gradient: "from-blue-400 to-indigo-500", shadow: "shadow-blue-200" },
  { level: "Niveau 3", label: "Parrain du Niv. 2", amount: 400, gradient: "from-violet-400 to-purple-500", shadow: "shadow-violet-200" },
];

const FEATURES = [
  { icon: Gift, gradient: "from-violet-500 to-purple-500", label: "Bonus de bienvenue", desc: "Crédité automatiquement à l'activation de votre compte." },
  { icon: Users, gradient: "from-blue-500 to-indigo-500", label: "Commissions MLM 3 niveaux", desc: "1 300 · 700 · 400 XOF par filleul activé dans votre réseau." },
  { icon: Zap, gradient: "from-amber-400 to-orange-500", label: "Points convertibles", desc: "1 000 pts = 500 XOF sur votre solde, sans limite." },
  { icon: TrendingUp, gradient: "from-emerald-400 to-teal-500", label: "Revenus passifs", desc: "Vos filleuls travaillent, vous récoltez sur 3 générations." },
];

const card = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Bonus() {
  const { data: stats, isLoading } = useGetDashboard();

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-6 text-white relative overflow-hidden shadow-xl shadow-violet-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute top-8 right-20 h-5 w-5 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-violet-200 text-xs font-bold uppercase tracking-wider">Bonus de Bienvenue</p>
                <p className="font-black text-2xl leading-tight">Votre récompense</p>
              </div>
            </div>
            {isLoading ? (
              <div className="h-12 bg-white/20 animate-pulse rounded-2xl" />
            ) : (
              <div>
                <p className="text-violet-200 text-xs mb-1">Montant crédité sur votre solde</p>
                <p className="text-4xl font-black">{formatFcfa(stats?.welcomeBonus || 0)}</p>
                <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span className="text-xs font-bold text-white">Crédité automatiquement</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* MLM Plan */}
        <motion.div custom={0} variants={card} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-black text-gray-900">Plan de rémunération MLM</h2>
          </div>
          <div className="space-y-3">
            {MLM_LEVELS.map((lvl, i) => (
              <motion.div
                key={lvl.level}
                custom={i + 1}
                variants={card}
                initial="hidden"
                animate="visible"
                className={`rounded-2xl bg-gradient-to-r ${lvl.gradient} p-4 text-white shadow-lg ${lvl.shadow}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{lvl.level}</p>
                    <p className="font-black text-base mt-0.5">{lvl.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs">Par filleul activé</p>
                    <p className="text-2xl font-black mt-0.5">{lvl.amount.toLocaleString()}</p>
                    <p className="text-white/80 text-xs">XOF</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Mes gains MLM */}
        {!isLoading && stats && (
          <motion.div
            custom={4}
            variants={card}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-black text-gray-900">Mes gains MLM actuels</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Niveau 1", value: stats.earnings.mlmLevel1, dot: "bg-emerald-400" },
                { label: "Niveau 2", value: stats.earnings.mlmLevel2, dot: "bg-blue-400" },
                { label: "Niveau 3", value: stats.earnings.mlmLevel3, dot: "bg-violet-400" },
                { label: "Tâches",   value: stats.earnings.tasks,    dot: "bg-amber-400" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${row.dot}`} />
                    <span className="text-sm font-semibold text-gray-600">{row.label}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{formatFcfa(row.value || 0)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Avantages */}
        <motion.div custom={5} variants={card} initial="hidden" animate="visible">
          <h2 className="font-black text-gray-900 mb-3">Tous vos avantages</h2>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                custom={i + 6}
                variants={card}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
              >
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shrink-0 shadow-md`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
