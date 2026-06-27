import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard, useGetPublicSettings, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, ArrowDownCircle, Copy, CheckCircle, Users, Zap, Sparkles } from "lucide-react";

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR")} XOF`;
}

const BASE = import.meta.env.BASE_URL;

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
  const { data: publicSettings } = useGetPublicSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      toast({ title: "Lien copié !", description: "Partagez-le pour gagner des commissions." });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );

  const activationFee = publicSettings?.activationFee ?? 3000;
  const totalBalance = stats?.totalBalance || 0;

  const statCards = [
    {
      label: "Solde disponible",
      value: formatFcfa(stats?.balance || 0),
      icon: Wallet,
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      shadow: "shadow-emerald-200/60",
    },
    {
      label: "Total retiré",
      value: formatFcfa(stats?.totalWithdrawn || 0),
      icon: ArrowDownCircle,
      gradient: "from-orange-500 to-amber-500",
      bg: "bg-orange-50",
      shadow: "shadow-orange-200/60",
    },
    {
      label: "Mes points",
      value: `${(stats?.points || 0).toLocaleString()} pts`,
      icon: Zap,
      gradient: "from-amber-400 to-orange-500",
      bg: "bg-amber-50",
      shadow: "shadow-amber-200/60",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 text-white relative overflow-hidden shadow-xl shadow-blue-300/30"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute top-6 right-16 h-6 w-6 rounded-full bg-white/20" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-blue-200 text-xs font-semibold">Bienvenue sur Nexarix</p>
                <p className="font-black text-xl leading-tight">{user?.username}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span className="text-xs font-black text-yellow-200">Premium</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Frais d'activation</p>
                <p className="font-black text-lg">{formatFcfa(activationFee)}</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Solde Total</p>
                <p className="font-black text-lg">{formatFcfa(totalBalance)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={item}
              initial="hidden"
              animate="visible"
              className={`rounded-2xl ${s.bg} p-4 shadow-md ${s.shadow} border border-white`}
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-gray-500 text-xs font-semibold mb-0.5">{s.label}</p>
              <p className="font-black text-base text-gray-900 leading-tight">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Referral link */}
        <motion.div
          custom={5}
          variants={item}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-gray-900">Mon lien de parrainage</span>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 mb-3 border border-gray-100">
            <p className="font-mono text-xs text-gray-500 truncate">{stats?.referralLink}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`w-full rounded-2xl h-11 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              copied
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 hover:shadow-violet-300"
            }`}
          >
            {copied ? (
              <><CheckCircle className="h-4 w-4" /> Lien copié !</>
            ) : (
              <><Copy className="h-4 w-4" /> Copier mon lien</>
            )}
          </button>
        </motion.div>

      </div>
    </AppLayout>
  );
}
