import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { 
  LayoutDashboard, 
  ShoppingCart,
  ArrowDownCircle, 
  Wallet, 
  LogOut, 
  Menu,
  Store,
  LockOpen,
  Calculator,
  ArrowLeftRight,
  Package,
  RotateCcw,
  Truck,
  BarChart3,
  Bell,
  User,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, currentStore, stores, setCurrentStore, user } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: "/apertura", label: "Apertura", icon: LockOpen },
    { href: "/ventas", label: "Ventas (POS)", icon: ShoppingCart },
    { href: "/devoluciones", label: "Devoluciones", icon: RotateCcw },
    { href: "/egresos", label: "Egresos", icon: ArrowDownCircle },
    { href: "/transferencias", label: "Transfer. Cajas", icon: ArrowLeftRight },
    { href: "/traspasos-productos", label: "Traspasos", icon: Truck },
    { href: "/cierre", label: "Cierre", icon: Calculator },
    { href: "/inventario", label: "Inventario", icon: Package, adminOnly: true },
    { href: "/proveedores", label: "Proveedores", icon: Building2, adminOnly: true },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
  ];

  const handleStoreChange = (storeId: string) => {
    const store = stores.find(s => s.id.toString() === storeId);
    if (store) {
      setCurrentStore(store);
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const NavContent = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-xl text-sidebar-primary cursor-pointer">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm">
            FR
          </div>
          <span className="text-sidebar-foreground">Finanzas</span>
        </Link>
      </div>

      <div className="px-4 pt-2">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 border border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground/70 text-xs uppercase font-semibold mb-2">
            <Store className="h-3 w-3" />
            Tienda Activa
          </div>
          {user?.role === 'admin' ? (
            <Select 
              value={currentStore?.id?.toString() || ""} 
              onValueChange={handleStoreChange}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder="Seleccionar tienda" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="bg-sidebar border border-sidebar-border text-sidebar-foreground rounded-md px-3 py-2 text-sm">
              {currentStore?.name || "Sin tienda asignada"}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        <nav className="grid gap-1">
          {filteredNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
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
                {item.adminOnly && (
                  <Badge variant="outline" className="ml-auto text-xs py-0">
                    Admin
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1 text-sm text-sidebar-foreground/70">
          <User className="h-4 w-4" />
          <span className="truncate">{user?.full_name || user?.username}</span>
          <Badge variant="secondary" className="ml-auto text-xs capitalize">
            {user?.role}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-sidebar z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 font-heading font-bold text-lg text-sidebar-foreground">
          <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs">
            FR
          </div>
          Finanzas
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentStore?.name}
          </Badge>
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
      </div>

      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen transition-all duration-300 ease-in-out">
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
