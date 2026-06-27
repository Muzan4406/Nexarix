import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, LayoutDashboard, Users, CheckSquare, Wallet, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Tasks", href: "/admin/tasks", icon: CheckSquare },
    { name: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
  };

  const NavContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-14 items-center px-4 font-bold text-xl text-destructive">NEXARIX ADMIN</div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium gap-1">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <span
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-background md:block md:w-64">
        <NavContent />
      </aside>

      <div className="flex flex-col flex-1">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 md:h-[60px]">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1 font-semibold md:hidden text-destructive">NEXARIX ADMIN</div>
          <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <span className="text-sm font-medium">{user?.username} (Admin)</span>
            <div className="h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
