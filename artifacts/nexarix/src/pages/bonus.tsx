import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Gift, CheckCircle, TrendingUp, Users, Zap, Star } from "lucide-react";

function formatFcfa(v: number) { return `XOF ${v.toLocaleString("fr-FR")}`; }

const BONUS_FEATURES = [
  { icon: Gift, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", label: "Bonus reçu à l'activation", desc: "Crédité automatiquement sur votre solde dès que votre compte est activé." },
  { icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", label: "Commissions MLM 3 niveaux", desc: "Gagnez 1 300 · 700 · 400 XOF pour chaque filleul activé dans votre réseau." },
  { icon: Zap, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", label: "Points convertibles", desc: "Chaque tâche réalisée rapporte des points. 1 000 pts = 500 XOF sur votre solde." },
  { icon: TrendingUp, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Revenus passifs", desc: "Vos filleuls travaillent, vous êtes récompensé sur 3 générations en dessous de vous." },
];

const MLM_LEVELS = [
  { level: "Niveau 1", label: "Parrain direct", amount: 1300, color: "from-emerald-400 to-emerald-600", shadow: "shadow-emerald-200 dark:shadow-emerald-900/40" },
  { level: "Niveau 2", label: "Parrain du niveau 1", amount: 700, color: "from-blue-400 to-blue-600", shadow: "shadow-blue-200 dark:shadow-blue-900/40" },
  { level: "Niveau 3", label: "Parrain du niveau 2", amount: 400, color: "from-purple-400 to-purple-600", shadow: "shadow-purple-200 dark:shadow-purple-900/40" },
];

export default function Bonus() {
  const { data: stats, isLoading } = useGetDashboard();

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bonus &amp; Avantages</h1>
          <p className="text-muted-foreground text-sm">Votre programme de récompenses Nexarix</p>
        </div>

        {/* Carte bonus principal */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-5 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-purple-100 text-xs">Bonus de Bienvenue</p>
              <p className="font-bold text-lg leading-tight">Votre récompense</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-10 bg-white/20 animate-pulse rounded-xl" />
          ) : (
            <div>
              <p className="text-purple-100 text-xs mb-1">Montant crédité</p>
              <p className="text-4xl font-black">{formatFcfa(stats?.welcomeBonus || 0)}</p>
              <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 w-fit">
                <CheckCircle className="h-4 w-4 text-green-300" />
                <span className="text-xs font-medium">Crédité sur votre solde</span>
              </div>
            </div>
          )}
        </div>

        {/* Plan de rémunération MLM */}
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#1565C0]" />
            Plan de rémunération MLM
          </h2>
          <div className="space-y-3">
            {MLM_LEVELS.map(lvl => (
              <div
                key={lvl.level}
                className={`rounded-2xl bg-gradient-to-r ${lvl.color} p-4 text-white shadow-md ${lvl.shadow}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-medium">{lvl.level}</p>
                    <p className="font-bold text-base">{lvl.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs">Par filleul activé</p>
                    <p className="text-2xl font-black">{lvl.amount.toLocaleString()} XOF</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gains MLM actuels */}
        {!isLoading && stats && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-4">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Mes gains MLM actuels
            </h2>
            <div className="space-y-2">
              {[
                { label: "Niveau 1", value: stats.earnings.mlmLevel1, color: "text-emerald-600" },
                { label: "Niveau 2", value: stats.earnings.mlmLevel2, color: "text-blue-600" },
                { label: "Niveau 3", value: stats.earnings.mlmLevel3, color: "text-purple-600" },
                { label: "Tâches",   value: stats.earnings.tasks,    color: "text-amber-600" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{formatFcfa(item.value || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avantages */}
        <div>
          <h2 className="text-base font-bold mb-3">Tous vos avantages</h2>
          <div className="space-y-3">
            {BONUS_FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
