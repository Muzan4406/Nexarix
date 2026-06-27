import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut, Menu, LayoutDashboard, CheckSquare, Wallet, MessageCircle,
  Phone, User, ChevronDown, Gift, Star, History, Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

type NavItem = { name: string; href: string; icon: React.ElementType };
type NavGroup = { name: string; icon: React.ElementType; items: NavItem[]; accent?: string };
type NavSection = { kind: "item"; item: NavItem } | { kind: "group"; group: NavGroup };

const NAV_SECTIONS: NavSection[] = [
  {
    kind: "item",
    item: { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
  },
  {
    kind: "item",
    item: { name: "Mon Compte", href: "/profile", icon: User },
  },
  {
    kind: "group",
    group: {
      name: "Communauté",
      icon: MessageCircle,
      accent: "text-blue-500",
      items: [
        { name: "Canal Telegram", href: "/community", icon: MessageCircle },
        { name: "WhatsApp", href: "/community", icon: MessageCircle },
        { name: "Filleuls (Downline)", href: "/downline", icon: Users },
      ],
    },
  },
  {
    kind: "group",
    group: {
      name: "Gains",
      icon: Star,
      accent: "text-amber-500",
      items: [
        { name: "Tâches", href: "/tasks", icon: CheckSquare },
        { name: "Bonus de Bienvenue", href: "/bonus", icon: Gift },
        { name: "Roue de la Fortune", href: "/spin", icon: Star },
      ],
    },
  },
  {
    kind: "group",
    group: {
      name: "Retraits",
      icon: Wallet,
      accent: "text-emerald-500",
      items: [
        { name: "Retrait Solde", href: "/withdrawals", icon: Wallet },
        { name: "Historique", href: "/withdrawals", icon: History },
      ],
    },
  },
  {
    kind: "item",
    item: { name: "Assistance", href: "/contact", icon: Phone },
  },
];

function NavLink({ href, icon: Icon, name, active, onClick }: {
  href: string; icon: React.ElementType; name: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <span
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer font-medium",
          active
            ? "bg-[#1565C0] text-white shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {name}
      </span>
    </Link>
  );
}

function NavGroupSection({ group, location, onClose }: {
  group: NavGroup; location: string; onClose?: () => void;
}) {
  const isAnyActive = group.items.some(i => location.startsWith(i.href));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
          isAnyActive
            ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
        onClick={() => setOpen(o => !o)}
      >
        <group.icon className={cn("h-4 w-4 shrink-0", group.accent)} />
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-gray-400", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 pl-3">
          {group.items.map(item => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <span
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all cursor-pointer font-medium",
                    active
                      ? "text-[#1565C0] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-gray-100 dark:border-gray-800">
        <img src={`${BASE}logo.png`} alt="Nexarix" className="h-9 w-auto object-contain" />
      </div>

      {/* User card */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1565C0]/10 to-[#1E88E5]/5 rounded-xl px-3 py-2.5">
          <div className="h-9 w-9 rounded-full bg-[#1565C0] text-white flex items-center justify-center font-bold text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{user?.username}</p>
            <p className="text-xs text-[#1565C0] font-medium">Premium Member</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-2 space-y-0.5">
        {NAV_SECTIONS.map((section, i) => {
          if (section.kind === "item") {
            const active = location.startsWith(section.item.href);
            return (
              <NavLink
                key={i}
                href={section.item.href}
                icon={section.item.icon}
                name={section.item.name}
                active={active}
                onClick={onClose}
              />
            );
          }
          return (
            <NavGroupSection
              key={i}
              group={section.group}
              location={location}
              onClose={onClose}
            />
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl font-medium"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 md:block md:w-64 shrink-0">
        <NavContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 md:hidden sticky top-0 z-10">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-gray-200">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-white dark:bg-gray-900">
              <NavContent onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <img src={`${BASE}logo.png`} alt="Nexarix" className="h-7 w-auto" />

          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#1565C0] text-white flex items-center justify-center font-bold text-sm">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
