import { motion } from "framer-motion";
import { useGetProfile } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { User, Phone, Mail, Calendar, MapPin, Link, Wallet, Users, Star, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

const rise = (i: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
});

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-500 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );
  if (!profile) return null;

  const isActive = profile.status === "active";

  const stats = [
    { label: "Solde",    value: formatCurrency(profile.balance, profile.country),       icon: Wallet, color: "#10b981", bg: "bg-emerald-50" },
    { label: "Filleuls", value: String(profile.totalDownlines),                         icon: Users,  color: "#2563eb", bg: "bg-blue-50"    },
    { label: "Adhésion", value: profile.membership,                                     icon: Star,   color: "#f59e0b", bg: "bg-amber-50"   },
    { label: "Retiré",   value: formatCurrency(profile.totalWithdrawn, profile.country), icon: Wallet, color: "#8b5cf6", bg: "bg-violet-50"  },
  ];

  const infos = [
    { label: "Nom d'utilisateur", value: profile.username,   icon: User,     color: "#2563eb" },
    { label: "Email",             value: profile.email,       icon: Mail,     color: "#8b5cf6" },
    { label: "Téléphone",         value: profile.phone,       icon: Phone,    color: "#10b981" },
    { label: "Parrain",           value: profile.upline || "Aucun", icon: Link, color: "#f59e0b" },
    { label: "Membre depuis",     value: profile.joinedAt ? format(new Date(profile.joinedAt), "dd MMMM yyyy") : "—", icon: Calendar, color: "#ec4899" },
    { label: "Pays",              value: profile.country,     icon: MapPin,   color: "#14b8a6" },
  ];

  return (
    <AppLayout>
      <div className="space-y-4 pb-6">

        {/* ── Hero ─────────────────────────────── */}
        <motion.div
          variants={rise(0)} initial="hidden" animate="visible"
          className="relative overflow-hidden rounded-[28px] text-white"
          style={{ background: "linear-gradient(145deg, #2e1065 0%, #4c1d95 40%, #7c3aed 100%)" }}
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/5" />

          <div className="relative z-10 p-5">
            {/* Avatar + nom */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative shrink-0">
                {/* Ring animé */}
                <div className="absolute inset-0 rounded-[22px] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent" />
                <div
                  className="h-[68px] w-[68px] rounded-[22px] flex items-center justify-center font-black text-3xl shadow-lg"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))" }}
                >
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-[22px] leading-tight truncate" data-testid="text-username">
                  {profile.username}
                </h1>
                <p className="text-violet-200/80 text-[11px] font-medium mt-0.5">
                  Membre depuis {profile.joinedAt ? format(new Date(profile.joinedAt), "MMMM yyyy") : "—"}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border border-white/10">
                    {profile.membership}
                  </span>
                  <span className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border border-white/10">
                    {profile.country}
                  </span>
                  <span className={cn(
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 border",
                    isActive
                      ? "bg-emerald-400/20 text-emerald-100 border-emerald-400/25"
                      : "bg-amber-400/20 text-amber-100 border-amber-400/25"
                  )}>
                    {isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sécurité badge */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
              <p className="text-[11px] text-violet-100/80 font-medium">
                Compte vérifié · Données protégées
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              variants={rise(i + 1)}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-[20px] border border-gray-100/80 shadow-sm overflow-hidden"
            >
              <div className="h-[3px]" style={{ background: s.color }} />
              <div className="p-3.5 flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</p>
                  <p className="font-black text-gray-900 text-[15px] leading-tight truncate">{s.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Infos profil ─────────────────────── */}
        <motion.div
          variants={rise(5)} initial="hidden" animate="visible"
          className="bg-white rounded-[24px] border border-gray-100/80 shadow-sm overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2 border-b border-gray-50">
            <h2 className="font-black text-gray-900 text-[15px]">Informations du profil</h2>
          </div>
          <div className="p-3 space-y-1.5">
            {infos.map((info, i) => (
              <motion.div
                key={info.label}
                variants={rise(i + 6)}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50/80 transition-colors"
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${info.color}15` }}
                >
                  <info.icon className="h-3.5 w-3.5" style={{ color: info.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{info.label}</p>
                  <p
                    className="text-[13px] font-semibold text-gray-900 truncate leading-tight mt-0.5"
                    data-testid={`text-profile-${info.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {info.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
