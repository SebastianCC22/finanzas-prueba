import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, DashboardStats, Alert } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ShoppingCart, ArrowDownCircle, Wallet, TrendingUp,
  Package, AlertTriangle, Clock, Bell, Store,
  DollarSign, BarChart3, FileText
} from "lucide-react";

export default function Dashboard() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Store className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {currentStore?.name}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen general de tu actividad
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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
          </CardContent>
        </Card>
      </div>

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
