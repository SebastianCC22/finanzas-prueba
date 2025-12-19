import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, AdvancedStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet, FileText, Download, BarChart3, Package,
  DollarSign, TrendingUp, Store, CreditCard, Banknote, Award
} from "lucide-react";

export default function Reportes() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      loadAdvancedStats();
    }
  }, [isAdmin]);

  const loadAdvancedStats = async () => {
    setIsLoading(true);
    try {
      const stats = await api.getAdvancedStats();
      setAdvancedStats(stats);
    } catch (error: any) {
      console.log("Stats not available for this user");
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (type: "sales" | "inventory" | "expenses", format: "excel" | "pdf") => {
    if (!currentStore) return;
    
    const filters: Record<string, string> = {
      store_id: currentStore.id.toString(),
    };
    
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    
    const url = api.getExportUrl(type, format, filters);
    window.open(url, "_blank");
    
    toast({
      title: "Descarga iniciada",
      description: `El reporte se está descargando`,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPaymentIcon = (method: string) => {
    if (method === "efectivo") return Banknote;
    return CreditCard;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Reportes y Estadísticas - {currentStore?.name}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Estadísticas avanzadas y reportes descargables" : "Genera y descarga reportes"}
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? "stats" : "reports"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="stats">Estadísticas</TabsTrigger>}
          <TabsTrigger value="reports">Descargar Reportes</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="stats" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : advancedStats ? (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-500" />
                        Ventas por Método de Pago
                      </CardTitle>
                      <CardDescription>Últimos 30 días</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {advancedStats.payment_methods.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No hay datos de pagos
                        </p>
                      ) : (
                        advancedStats.payment_methods.map((pm) => {
                          const Icon = getPaymentIcon(pm.payment_method);
                          return (
                            <div key={pm.payment_method} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="capitalize font-medium">{pm.payment_method}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-bold">
                                    {formatCurrency(pm.total_amount)}
                                  </span>
                                  <Badge variant="secondary" className="ml-2">
                                    {pm.percentage}%
                                  </Badge>
                                </div>
                              </div>
                              <Progress value={pm.percentage} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {pm.transaction_count} transacciones
                              </p>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-violet-500" />
                        Rendimiento por Tienda
                      </CardTitle>
                      <CardDescription>Últimos 30 días</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {advancedStats.stores.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No hay datos de tiendas
                        </p>
                      ) : (
                        advancedStats.stores.map((store) => (
                          <div
                            key={store.store_id}
                            className="p-4 border rounded-lg space-y-2"
                            data-testid={`store-stats-${store.store_id}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{store.store_name}</span>
                              <Badge variant={store.profit >= 0 ? "default" : "destructive"}>
                                {store.profit >= 0 ? "+" : ""}{formatCurrency(store.profit)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground block">Ventas</span>
                                <span className="font-mono text-emerald-600">
                                  {formatCurrency(store.total_sales)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block">Egresos</span>
                                <span className="font-mono text-rose-600">
                                  {formatCurrency(store.total_expenses)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block"># Ventas</span>
                                <span className="font-mono">
                                  {store.sales_count}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        Productos Más Vendidos
                      </CardTitle>
                      <CardDescription>Top 10 - Últimos 30 días</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {advancedStats.top_products.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No hay datos de ventas
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {advancedStats.top_products.map((product, index) => (
                            <div
                              key={product.product_id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                  {index + 1}
                                </Badge>
                                <div>
                                  <p className="font-medium text-sm">{product.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.quantity_sold} unidades
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-sm font-bold text-emerald-600">
                                {formatCurrency(product.total_revenue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-500" />
                        Productos Menos Vendidos
                      </CardTitle>
                      <CardDescription>Baja rotación - Últimos 30 días</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {advancedStats.least_sold_products.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No hay datos
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {advancedStats.least_sold_products.map((product) => (
                            <div
                              key={product.product_id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div>
                                <p className="font-medium text-sm">{product.product_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.quantity_sold} unidades vendidas
                                </p>
                              </div>
                              <span className="font-mono text-sm text-muted-foreground">
                                {formatCurrency(product.total_revenue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No se pudieron cargar las estadísticas avanzadas
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Fecha</CardTitle>
              <CardDescription>Opcional: filtra los reportes por rango de fechas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Reporte de Ventas
                </CardTitle>
                <CardDescription>
                  Historial de ventas con detalle de productos y pagos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => exportReport("sales", "pdf")}
                  data-testid="button-export-sales-pdf"
                >
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  Descargar PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Reporte de Inventario
                </CardTitle>
                <CardDescription>
                  Lista de productos con stock y precios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => exportReport("inventory", "excel")}
                  data-testid="button-export-inventory-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                  Descargar Excel
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => exportReport("inventory", "pdf")}
                  data-testid="button-export-inventory-pdf"
                >
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  Descargar PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-rose-500" />
                  Reporte de Egresos
                </CardTitle>
                <CardDescription>
                  Historial de gastos con descripción
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => exportReport("expenses", "pdf")}
                  data-testid="button-export-expenses-pdf"
                >
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  Descargar PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
