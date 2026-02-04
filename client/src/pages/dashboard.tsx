import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, DashboardStats, Alert } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ShoppingCart, ArrowDownCircle, Wallet, TrendingUp, TrendingDown,
  Package, AlertTriangle, Clock, Bell, Store,
  DollarSign, BarChart3, FileText, Target, Receipt, Download
} from "lucide-react";

export default function Dashboard() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [statsData, alertsData] = await Promise.all([
        api.getDashboardStats(currentStore.id),
        api.getAlerts(currentStore.id, true),
      ]);
      setStats(statsData);
      setAlerts(alertsData.slice(0, 5));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen -m-4 md:-m-8 bg-slate-950 flex flex-col">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Store className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {currentStore?.name}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white" data-testid="text-welcome">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <p className="text-slate-400 mt-1">
            Resumen del día
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 p-10 text-white shadow-2xl shadow-emerald-500/30">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm mb-6">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <p className="text-emerald-100 text-sm uppercase tracking-widest mb-3">
                  Ventas del Día
                </p>
                <p className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" data-testid="text-sales-today">
                  {formatCurrency(stats?.total_sales_today || 0)}
                </p>
                <div className="flex items-center gap-2 text-emerald-100">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm">{stats?.sales_count_today || 0} transacciones</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 p-10 text-white shadow-2xl shadow-rose-500/30">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
                <p className="text-rose-100 text-sm uppercase tracking-widest mb-3">
                  Egresos del Día
                </p>
                <p className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" data-testid="text-expenses-today">
                  {formatCurrency(stats?.total_expenses_today || 0)}
                </p>
                <div className="flex items-center gap-2 text-rose-100">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Gastos registrados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Store className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {currentStore?.name}
            </span>
            <Badge variant="secondary" className="ml-2">Administrador</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            Panel de control administrativo
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("/api/download-source", "_blank")}
          data-testid="button-download-source"
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar Código
        </Button>
      </div>

      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-100">
                  Ventas Hoy
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-sales-today">
                  {formatCurrency(stats?.total_sales_today || 0)}
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  {stats?.sales_count_today || 0} ventas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  Ventas Semana
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-sales-week">
                  {formatCurrency(stats?.total_sales_week || 0)}
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  {stats?.sales_count_week || 0} ventas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-violet-100">
                  Ventas Mes
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-violet-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-sales-month">
                  {formatCurrency(stats?.total_sales_month || 0)}
                </div>
                <p className="text-xs text-violet-200 mt-1">
                  {stats?.sales_count_month || 0} ventas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-100">
                  Ticket Promedio
                </CardTitle>
                <Receipt className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-average-ticket">
                  {formatCurrency(stats?.average_ticket || 0)}
                </div>
                <p className="text-xs text-amber-200 mt-1">Últimos 30 días</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className={`border-2 ${(stats?.profit_today || 0) >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {(stats?.profit_today || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  Ganancia Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${(stats?.profit_today || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} data-testid="text-profit-today">
                  {formatCurrency(stats?.profit_today || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ventas - Costos - Egresos
                </p>
              </CardContent>
            </Card>

            <Card className={`border-2 ${(stats?.profit_week || 0) >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {(stats?.profit_week || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  Ganancia Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${(stats?.profit_week || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} data-testid="text-profit-week">
                  {formatCurrency(stats?.profit_week || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Últimos 7 días
                </p>
              </CardContent>
            </Card>

            <Card className={`border-2 ${(stats?.profit_month || 0) >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {(stats?.profit_month || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  Ganancia Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${(stats?.profit_month || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} data-testid="text-profit-month">
                  {formatCurrency(stats?.profit_month || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Últimos 30 días
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Valor del Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-inventory-value">
                  {formatCurrency(stats?.inventory_value || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Costo total de productos en stock
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-100">
                  Egresos Hoy
                </CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-rose-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono" data-testid="text-expenses-today">
                  {formatCurrency(stats?.total_expenses_today || 0)}
                </div>
                <p className="text-xs text-rose-200 mt-1">
                  Semana: {formatCurrency(stats?.total_expenses_week || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
      </>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Estado del Inventario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/inventario?filter=out_of_stock">
                <button className="w-full flex items-center justify-between p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>Agotados</span>
                  </div>
                  <Badge variant="destructive" data-testid="badge-out-of-stock">
                    {stats?.products_out_of_stock || 0}
                  </Badge>
                </button>
              </Link>
              <Link href="/inventario?filter=low_stock">
                <button className="w-full flex items-center justify-between p-3 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-500" />
                    <span>Stock Bajo</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-500" data-testid="badge-low-stock">
                    {stats?.products_low_stock || 0}
                  </Badge>
                </button>
              </Link>
              <Link href="/inventario">
                <Button variant="outline" className="w-full mt-2" data-testid="button-view-inventory">
                  Ver Inventario
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas Recientes
                {(stats?.unread_alerts || 0) > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats?.unread_alerts}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay alertas pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 bg-muted rounded-lg"
                      data-testid={`alert-${alert.id}`}
                    >
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.message?.slice(0, 60)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
