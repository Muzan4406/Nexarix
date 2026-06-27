import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, LayoutDashboard, Users, CheckSquare, Wallet, Settings, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { name: "Dashboard",   href: "/admin/dashboard",   icon: LayoutDashboard, color: "text-blue-400" },
  { name: "Utilisateurs",href: "/admin/users",        icon: Users,           color: "text-purple-400" },
  { name: "Tâches",      href: "/admin/tasks",        icon: CheckSquare,     color: "text-amber-400" },
  { name: "Retraits",    href: "/admin/withdrawals",  icon: Wallet,          color: "text-emerald-400" },
  { name: "Paramètres",  href: "/admin/settings",     icon: Settings,        color: "text-gray-400" },
];

function NavContent({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-[#0F172A]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight">NEXARIX</p>
            <p className="text-blue-400 text-xs font-medium">Panneau Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(({ name, href, icon: Icon, color }) => {
          const active = location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <span
                onClick={onNav}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 group",
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? color : "group-hover:text-white")} />
                <span className="text-sm font-medium flex-1">{name}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Admin profile + logout */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
            <p className="text-gray-500 text-xs">Administrateur</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Déconnexion</span>
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 shrink-0 border-r border-gray-800">
        <NavContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-[#0F172A] border-b border-white/5 sticky top-0 z-10">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 border-0">
              <NavContent onNav={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">N</span>
            </div>
            <span className="text-white font-bold text-sm truncate">Admin · {currentPage}</span>
          </div>
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:flex items-center px-8 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">{currentPage}</h2>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
