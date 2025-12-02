import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useStore } from "@/lib/store";
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  LogOut, 
  Menu,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentStore } = useStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: "/ingresos", label: "Ingresos", icon: ArrowUpCircle },
    { href: "/egresos", label: "Egresos", icon: ArrowDownCircle },
    { href: "/cuentas", label: "Cuentas", icon: Wallet },
  ];

  const NavContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-2 font-heading font-bold text-xl text-sidebar-primary cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm">
              FR
            </div>
            <span className="text-sidebar-foreground">Finanzas Rincon Integral</span>
          </div>
        </Link>
      </div>

      {/* Store Badge in Sidebar */}
      <div className="px-4 pt-4">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground/70 text-xs uppercase font-semibold mb-1">
            <Store className="h-3 w-3" />
            Tienda Activa
          </div>
          <div className="text-sidebar-foreground font-medium truncate" title={currentStore || ''}>
            {currentStore}
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-3 py-2">
        <nav className="grid gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-current" : "text-sidebar-foreground/50")} />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-destructive text-destructive-foreground"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Cambiar Tienda
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-sidebar z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 font-heading font-bold text-lg text-sidebar-foreground">
          <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs">
            FR
          </div>
          Finanzas Rincon
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen transition-all duration-300 ease-in-out">
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
