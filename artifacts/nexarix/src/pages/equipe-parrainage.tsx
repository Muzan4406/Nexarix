import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Copy, CheckCircle, Gift, Users, Share2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.42, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function EquipeParrainage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboard();
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

  const handleShare = async () => {
    if (stats?.referralLink && navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins Nexarix",
          text: "Inscris-toi sur Nexarix avec mon lien de parrainage !",
          url: stats.referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-10">

        {/* Hero */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-3xl text-white"
          style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 45%, #059669 100%)" }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute top-6 right-28 h-3 w-3 rounded-full bg-emerald-300/40" />
          <div className="pointer-events-none absolute top-14 right-16 h-2 w-2 rounded-full bg-green-200/50" />

          <div className="relative z-10 p-5">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/20 shrink-0">
                  <Gift className="h-5 w-5 text-emerald-200" />
                </div>
                <div>
                  <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Mon équipe</p>
                  <p className="text-white font-black text-lg leading-tight">Lien de parrainage</p>
                </div>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl p-3.5 border border-white/10" style={{ background: "rgba(255,255,255,0.09)" }}>
                <p className="text-emerald-300/80 text-[9px] font-bold uppercase tracking-wider mb-1">Par filleul direct</p>
                <p className="font-black text-[22px] leading-none text-white">1 300 F</p>
              </div>
              <div className="rounded-2xl p-3.5 border border-white/10" style={{ background: "rgba(255,255,255,0.09)" }}>
                <p className="text-emerald-300/80 text-[9px] font-bold uppercase tracking-wider mb-1">Filleuls Niv. 1</p>
                <p className="font-black text-[22px] leading-none text-white">
                  {isLoading ? "—" : ((stats as any)?.downlineLevel1Count ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lien */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Votre lien unique</p>
          </div>

          <div className="p-4 space-y-3">
            {/* URL box */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="font-mono text-[12px] text-emerald-800 truncate flex-1 select-all">
                {isLoading ? "Chargement…" : (stats?.referralLink || "—")}
              </p>
            </div>

            {/* Boutons */}
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                className={cn(
                  "h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] transition-colors shadow-sm",
                  copied ? "bg-emerald-500 text-white" : "text-white"
                )}
                style={copied ? {} : { background: "linear-gradient(135deg, #059669, #047857)" }}
              >
                {copied
                  ? <><CheckCircle className="h-4 w-4" /> Copié !</>
                  : <><Copy className="h-4 w-4" /> Copier</>
                }
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                className="h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] text-emerald-700 border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Comment ça marche */}
        <motion.div
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Comment ça marche ?</p>
          </div>

          <div className="p-4 space-y-3">
            {[
              { num: "1", title: "Partagez votre lien", desc: "Envoyez votre lien unique à vos proches et contacts.", color: "#059669" },
              { num: "2", title: "Ils s'inscrivent", desc: "Chaque personne qui s'inscrit via votre lien devient votre filleul.", color: "#2563eb" },
              { num: "3", title: "Ils activent leur compte", desc: "Dès l'activation, vous recevez votre commission automatiquement.", color: "#7c3aed" },
              { num: "4", title: "Vous gagnez sur 3 niveaux", desc: "Touchez des commissions sur les filleuls de vos filleuls.", color: "#ea580c" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3.5 rounded-2xl bg-gray-50 border border-gray-100 p-3.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                  style={{ background: step.color }}
                >
                  {step.num}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm leading-tight">{step.title}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Commissions */}
        <motion.div
          custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
              <Gift className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Commissions par niveau</p>
          </div>

          <div className="p-3 space-y-2">
            {[
              { level: "Niveau 1", label: "Filleuls directs", amount: "1 300 F", bg: "#dcfce7", border: "#bbf7d0", text: "#14532d", badge: "#16a34a" },
              { level: "Niveau 2", label: "Filleuls de vos filleuls", amount: "600 F", bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a8a", badge: "#2563eb" },
              { level: "Niveau 3", label: "3ème génération", amount: "300 F", bg: "#f3e8ff", border: "#e9d5ff", text: "#4c1d95", badge: "#7c3aed" },
            ].map((row) => (
              <div
                key={row.level}
                className="flex items-center justify-between rounded-2xl border px-4 py-3"
                style={{ background: row.bg, borderColor: row.border }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: row.badge }}>
                    N{row.level.slice(-1)}
                  </div>
                  <div>
                    <p className="font-black text-sm" style={{ color: row.text }}>{row.level}</p>
                    <p className="text-[10px] font-semibold opacity-70" style={{ color: row.text }}>{row.label}</p>
                  </div>
                </div>
                <p className="font-black text-base" style={{ color: row.text }}>{row.amount}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
