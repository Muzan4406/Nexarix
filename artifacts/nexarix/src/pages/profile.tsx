import { motion } from "framer-motion";
import { useGetProfile } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { User, Phone, Mail, Calendar, MapPin, Link, Wallet, Users, Star, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="text-gray-400 text-sm font-medium">Chargement…</p>
      </div>
    </AppLayout>
  );
  if (!profile) return null;

  const isActive = profile.status === "active";

  const stats = [
    { label: "Solde",    value: formatCurrency(profile.balance, profile.country),         icon: Wallet, gradient: "from-emerald-400 to-teal-500" },
    { label: "Filleuls", value: String(profile.totalDownlines),       icon: Users,  gradient: "from-blue-400 to-indigo-500" },
    { label: "Adhésion", value: profile.membership,                  icon: Star,   gradient: "from-amber-400 to-orange-500" },
    { label: "Retiré",  value: formatCurrency(profile.totalWithdrawn, profile.country),   icon: Wallet, gradient: "from-violet-400 to-purple-500" },
  ];

  const infos = [
    { label: "Nom d'utilisateur", value: profile.username,   icon: User },
    { label: "Email",             value: profile.email,       icon: Mail },
    { label: "Téléphone",         value: profile.phone,       icon: Phone },
    { label: "Parrain",           value: profile.upline || "Aucun", icon: Link },
    { label: "Membre depuis",     value: profile.joinedAt ? format(new Date(profile.joinedAt), "dd MMMM yyyy") : "—", icon: Calendar },
    { label: "Pays",              value: profile.country,     icon: MapPin },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Hero profil */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-6 text-white relative overflow-hidden shadow-xl shadow-violet-300/30"
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-20 w-20 rounded-3xl bg-white/20 flex items-center justify-center font-black text-4xl shadow-inner shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-black text-2xl leading-tight" data-testid="text-username">
                {profile.username}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-white/20 rounded-xl px-2.5 py-1 text-xs font-bold">{profile.membership}</span>
                <span className="bg-white/20 rounded-xl px-2.5 py-1 text-xs font-bold">{profile.country}</span>
                <span className={cn(
                  "rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1",
                  isActive ? "bg-emerald-400/30 text-emerald-100" : "bg-amber-400/30 text-amber-100"
                )}>
                  {isActive ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="text-violet-200 text-xs mt-1 font-semibold">
                Membre depuis {profile.joinedAt ? format(new Date(profile.joinedAt), "MMMM yyyy") : "—"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={item}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center"
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2 shadow-md`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-black text-gray-900 text-sm leading-tight">{s.value}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Info card */}
        <motion.div
          custom={4}
          variants={item}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
        >
          <h2 className="font-black text-gray-900 mb-4">Informations du profil</h2>
          <div className="space-y-3">
            {infos.map((info, i) => (
              <motion.div
                key={info.label}
                custom={i + 5}
                variants={item}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="h-9 w-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                  <info.icon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{info.label}</p>
                  <p
                    className="text-sm font-black text-gray-900 truncate"
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
