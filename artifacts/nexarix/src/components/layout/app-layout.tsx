import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LogOut, Menu, LayoutDashboard, CheckSquare, Wallet,
  Phone, User, Star, History,
  Users, Zap, ChevronDown, ShoppingBag, GraduationCap, LayoutGrid,
  Crown, UserX, Trophy,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

type NavItem  = { name: string; href: string; icon: React.ElementType };
type NavGroup = { name: string; icon: React.ElementType; accent: string; items: NavItem[] };
type Section  = { kind: "item"; item: NavItem & { gradient: string } }
              | { kind: "group"; group: NavGroup };

const SECTIONS: Section[] = [
  { kind: "item", item: { name: "Vue d'ensemble", href: "/dashboard",  icon: LayoutDashboard, gradient: "from-blue-500 to-indigo-500" } },
  { kind: "item", item: { name: "Mon Compte",     href: "/profile",    icon: User,            gradient: "from-violet-500 to-purple-500" } },
  {
    kind: "group",
    group: {
      name: "Mon Équipe", icon: Users, accent: "text-cyan-500",
      items: [
        { name: "Niveau 1",           href: "/equipe/niveau-1", icon: Crown   },
        { name: "Niveau 2",           href: "/equipe/niveau-2", icon: Star    },
        { name: "Niveau 3",           href: "/equipe/niveau-3", icon: Zap     },
        { name: "Inactifs",           href: "/equipe/inactifs", icon: UserX   },
        { name: "Bonus Super Parrain",href: "/equipe/bonus",    icon: Trophy  },
      ],
    },
  },
  {
    kind: "group",
    group: {
      name: "Gains", icon: Star, accent: "text-amber-500",
      items: [
        { name: "Tâches",          href: "/tasks",  icon: CheckSquare },
        { name: "Mes Points",      href: "/points", icon: Zap },
        { name: "Roue de Fortune", href: "/spin",   icon: Star },
      ],
    },
  },
  {
    kind: "group",
    group: {
      name: "Retraits", icon: Wallet, accent: "text-emerald-500",
      items: [
        { name: "Retirer",    href: "/withdrawals",        icon: Wallet },
        { name: "Historique", href: "/withdrawal-history", icon: History },
      ],
    },
  },
  { kind: "item", item: { name: "Store Premium",  href: "/store",      icon: ShoppingBag,     gradient: "from-purple-500 to-fuchsia-500" } },
  { kind: "item", item: { name: "Formations",     href: "/formations", icon: GraduationCap,   gradient: "from-orange-500 to-amber-500" } },
  { kind: "item", item: { name: "Divers",          href: "/divers",     icon: LayoutGrid,      gradient: "from-sky-500 to-blue-500" } },
  { kind: "item", item: { name: "Assistance",     href: "/contact",    icon: Phone,           gradient: "from-rose-500 to-pink-500" } },
];

function NavLink({ href, icon: Icon, name, active, gradient, onClick }: {
  href: string; icon: React.ElementType; name: string; active: boolean; gradient: string; onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <span
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all cursor-pointer relative overflow-hidden group",
          active ? "text-white shadow-lg" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
        )}
      >
        {active && (
          <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl`} />
        )}
        <div className={cn(
          "relative z-10 h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
          active ? "bg-white/20" : "bg-gray-100 group-hover:bg-gray-200"
        )}>
          <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-gray-500")} />
        </div>
        <span className="relative z-10 font-semibold">{name}</span>
      </span>
    </Link>
  );
}

function NavGroupSection({ group, location, onClose }: { group: NavGroup; location: string; onClose?: () => void }) {
  const isAnyActive = group.items.some(i => location === i.href);
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all group",
          isAnyActive ? "text-gray-800 bg-gray-100/80" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/60"
        )}
      >
        <div className="h-7 w-7 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center shrink-0 transition-all">
          <group.icon className={cn("h-3.5 w-3.5", group.accent)} />
        </div>
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3 pb-1">
              {group.items.map(item => {
                const active = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <span
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs cursor-pointer font-semibold transition-all",
                        active ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isActive = (user as any)?.status === "active";

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-gray-100 gap-3 shrink-0">
        <img src={`${BASE}logo.png`} alt="Nexarix" className="h-10 w-10 rounded-2xl object-cover shrink-0 shadow-md" />
        <span className="font-black text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">NEXARIX</span>
      </div>

      {/* User card */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-3 text-white shadow-lg shadow-blue-200">
          <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-base shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight truncate">{user?.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-amber-400")} />
                <p className="text-blue-200 text-xs font-semibold">{isActive ? "Compte actif" : "Non activé"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-auto px-3 py-2 space-y-0.5">
        {SECTIONS.map((section, i) => {
          if (section.kind === "item") {
            const active = location === section.item.href;
            return (
              <NavLink key={i} href={section.item.href} icon={section.item.icon} name={section.item.name}
                active={active} gradient={section.item.gradient} onClick={onClose} />
            );
          }
          return <NavGroupSection key={i} group={section.group} location={location} onClose={onClose} />;
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <div className="h-7 w-7 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <LogOut className="h-3.5 w-3.5" />
          </div>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-[#f5f7fa]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:w-64 shrink-0 border-r border-gray-100 bg-white sticky top-0 h-screen overflow-hidden">
        <NavContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 md:hidden sticky top-0 z-30 shadow-sm">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors">
                <Menu className="h-4 w-4 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-0">
              <NavContent onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <img src={`${BASE}logo.png`} alt="Nexarix" className="h-8 w-8 rounded-xl object-cover shadow-sm" />
            <span className="font-black text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NEXARIX</span>
          </div>

          <div className="ml-auto">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
