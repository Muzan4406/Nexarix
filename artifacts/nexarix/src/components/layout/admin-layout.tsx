import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, LayoutDashboard, Users, CheckSquare, Wallet, Settings, ChevronRight, Shield, ShoppingBag, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV = [
  { name: "Vue d'ensemble", href: "/admin/dashboard",   icon: LayoutDashboard, accent: "from-blue-500 to-indigo-500",    dot: "bg-blue-400" },
  { name: "Utilisateurs",   href: "/admin/users",        icon: Users,           accent: "from-violet-500 to-purple-500", dot: "bg-violet-400" },
  { name: "Tâches",         href: "/admin/tasks",        icon: CheckSquare,     accent: "from-amber-500 to-orange-500",  dot: "bg-amber-400" },
  { name: "Retraits",       href: "/admin/withdrawals",  icon: Wallet,          accent: "from-emerald-500 to-teal-500",  dot: "bg-emerald-400" },
  { name: "Store Premium",  href: "/admin/store",        icon: ShoppingBag,     accent: "from-purple-500 to-fuchsia-500", dot: "bg-purple-400" },
  { name: "Formations",     href: "/admin/formations",   icon: GraduationCap,   accent: "from-orange-500 to-amber-500",  dot: "bg-orange-400" },
  { name: "Paramètres",     href: "/admin/settings",     icon: Settings,        accent: "from-gray-400 to-gray-500",     dot: "bg-gray-400" },
];

function NavContent({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col" style={{ background: "linear-gradient(160deg, #0a0f1e 0%, #0f172a 60%, #111827 100%)" }}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Nexarix" className="h-10 w-10 rounded-2xl object-cover shrink-0 shadow-lg" />
          <div>
            <p className="text-white font-black text-base tracking-tight leading-none">NEXARIX</p>
            <p className="text-blue-400 text-xs font-semibold mt-0.5">Administration</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
        {NAV.map(({ name, href, icon: Icon, accent, dot }) => {
          const active = location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <span
                onClick={onNav}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 cursor-pointer transition-all duration-200 group relative overflow-hidden",
                  active ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                {active && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b ${accent}`} />
                )}
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  active
                    ? `bg-gradient-to-br ${accent} shadow-md`
                    : "bg-white/5 group-hover:bg-white/10"
                )}>
                  <Icon className={cn("h-4 w-4", active ? "text-white" : "text-gray-500 group-hover:text-gray-300")} />
                </div>
                <span className={cn("text-sm font-semibold flex-1 transition-colors", active ? "text-white" : "text-gray-500 group-hover:text-gray-200")}>
                  {name}
                </span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-rose-500/30">
            {user?.username?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-bold truncate">{user?.username}</p>
            <p className="text-gray-500 text-xs">Administrateur</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer group"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Déconnexion</span>
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const currentPage = NAV.find(n => location.startsWith(n.href))?.name || "Admin";

  return (
    <div className="flex min-h-screen bg-[#f0f4f8]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 shrink-0">
        <div className="sticky top-0 h-screen overflow-hidden">
          <NavContent />
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-white/5 sticky top-0 z-30"
          style={{ background: "linear-gradient(160deg, #0a0f1e 0%, #0f172a 100%)" }}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 shrink-0 rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-0">
              <NavContent onNav={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm truncate">{currentPage}</span>
          </div>
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div>
            <h2 className="font-black text-gray-900 text-lg">{currentPage}</h2>
          </div>
          <div className="text-xs text-gray-400 font-medium">Nexarix · Panneau Admin</div>
        </div>

        {/* Content */}
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
