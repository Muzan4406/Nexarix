import { useState } from "react";
import { motion } from "framer-motion";
import { useGetDashboard, useGetDownline } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Gift, Users, Share2, Link2, Phone, Crown, Star, Zap } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.42, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

function MemberRow({ member, color }: { member: any; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md transition-shadow">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      >
        {member.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900 text-sm truncate">{member.username}</p>
        {member.phone && (
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-500 font-medium">{member.phone}</span>
          </div>
        )}
        {member.joinedAt && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {format(new Date(member.joinedAt), "dd MMM yyyy", { locale: fr })}
          </p>
        )}
      </div>
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
        Actif
      </span>
    </div>
  );
}

export default function EquipeParrainage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboard();
  const { data: downline, isLoading: downlineLoading } = useGetDownline();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

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

  const allMembers = [
    ...(downline?.level1 ?? []).map((m: any) => ({ ...m, _level: 1 })),
    ...(downline?.level2 ?? []).map((m: any) => ({ ...m, _level: 2 })),
    ...(downline?.level3 ?? []).map((m: any) => ({ ...m, _level: 3 })),
  ];
  const activeMembers = allMembers.filter(m => m.status === "active");
  const inactiveMembers = allMembers.filter(m => m.status !== "active");

  const level1Active = (downline?.level1 ?? []).filter((m: any) => m.status === "active");
  const level2Active = (downline?.level2 ?? []).filter((m: any) => m.status === "active");
  const level3Active = (downline?.level3 ?? []).filter((m: any) => m.status === "active");
  const inactiveAll = downline?.inactive ?? [];

  const totalActive = level1Active.length + level2Active.length + level3Active.length;

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
                <p className="font-black text-[22px] leading-none text-white">2 000 F</p>
              </div>
              <div className="rounded-2xl p-3.5 border border-white/10" style={{ background: "rgba(255,255,255,0.09)" }}>
                <p className="text-emerald-300/80 text-[9px] font-bold uppercase tracking-wider mb-1">Filleuls actifs</p>
                <p className="font-black text-[22px] leading-none text-white">
                  {statsLoading ? "—" : totalActive}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lien */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-50">
            <div className="h-7 w-7 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="font-black text-gray-900 text-sm">Votre lien unique</p>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
              <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="font-mono text-[12px] text-emerald-800 truncate flex-1 select-all">
                {statsLoading ? "Chargement…" : (stats?.referralLink || "—")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleCopy}
                className={cn(
                  "h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] transition-colors shadow-sm text-white",
                  copied ? "bg-emerald-500" : ""
                )}
                style={copied ? {} : { background: "linear-gradient(135deg, #059669, #047857)" }}
              >
                {copied ? <><CheckCircle className="h-4 w-4" /> Copié !</> : <><Copy className="h-4 w-4" /> Copier</>}
              </motion.button>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleShare}
                className="h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] text-emerald-700 border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Commissions */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
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
              { level: "Niveau 1", label: "Filleuls directs", amount: "2 000 F", bg: "#dcfce7", border: "#bbf7d0", text: "#14532d", badge: "#16a34a" },
              { level: "Niveau 2", label: "Filleuls de vos filleuls", amount: "700 F", bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a8a", badge: "#2563eb" },
              { level: "Niveau 3", label: "3ème génération", amount: "400 F", bg: "#f3e8ff", border: "#e9d5ff", text: "#4c1d95", badge: "#7c3aed" },
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

        {/* Tabs : Actifs / Inactifs */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "flex-1 py-3.5 text-sm font-black transition-colors",
                activeTab === "active" ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Actifs ({totalActive})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={cn(
                "flex-1 py-3.5 text-sm font-black transition-colors",
                activeTab === "inactive" ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50/50" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Inactifs ({inactiveAll.length})
              </div>
            </button>
          </div>

          <div className="p-4">
            {activeTab === "active" ? (
              downlineLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
              ) : totalActive === 0 ? (
                <div className="py-10 text-center">
                  <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-black text-gray-500 text-sm">Aucun filleul actif</p>
                  <p className="text-xs text-gray-400 mt-1">Partagez votre lien pour commencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Niveau 1 */}
                  {level1Active.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Crown className="h-3.5 w-3.5 text-emerald-600" />
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Niveau 1 — {level1Active.length} actif{level1Active.length > 1 ? "s" : ""}</p>
                      </div>
                      <div className="space-y-2">
                        {level1Active.map((m: any) => (
                          <MemberRow key={m.id} member={m} color="#10b981" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Niveau 2 */}
                  {level2Active.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Star className="h-3.5 w-3.5 text-blue-600" />
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Niveau 2 — {level2Active.length} actif{level2Active.length > 1 ? "s" : ""}</p>
                      </div>
                      <div className="space-y-2">
                        {level2Active.map((m: any) => (
                          <MemberRow key={m.id} member={m} color="#3b82f6" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Niveau 3 */}
                  {level3Active.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Zap className="h-3.5 w-3.5 text-violet-600" />
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Niveau 3 — {level3Active.length} actif{level3Active.length > 1 ? "s" : ""}</p>
                      </div>
                      <div className="space-y-2">
                        {level3Active.map((m: any) => (
                          <MemberRow key={m.id} member={m} color="#8b5cf6" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* Inactifs */
              downlineLoading ? (
                <div className="space-y-2.5">
                  {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
              ) : inactiveAll.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-200 mx-auto mb-3" />
                  <p className="font-black text-gray-500 text-sm">Tous vos filleuls sont actifs 🎉</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inactiveAll.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-3.5">
                      <div className="h-10 w-10 rounded-xl bg-gray-300 flex items-center justify-center font-black text-white text-sm shrink-0">
                        {m.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-700 text-sm truncate">{m.username}</p>
                        {m.phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-[11px] text-gray-500 font-medium">{m.phone}</span>
                          </div>
                        )}
                        {m.joinedAt && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {format(new Date(m.joinedAt), "dd MMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 shrink-0">
                        Inactif
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
