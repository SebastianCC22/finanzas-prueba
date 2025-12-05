import { useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, FileText, Download, BarChart3, Package, DollarSign, TrendingUp } from "lucide-react";

export default function Reportes() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      description: `El reporte de ${type === "sales" ? "ventas" : type === "inventory" ? "inventario" : "egresos"} se está descargando`,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Reportes - {currentStore?.name}
        </h1>
        <p className="text-muted-foreground">
          Genera y descarga reportes en PDF o Excel
        </p>
      </div>

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
              Historial de ventas con detalle de productos, pagos y descuentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportReport("sales", "excel")}
              data-testid="button-export-sales-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Descargar Excel
            </Button>
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
              Lista de productos con stock, precios y fechas de vencimiento
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
              Historial de gastos con método de pago y descripción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => exportReport("expenses", "excel")}
              data-testid="button-export-expenses-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Descargar Excel
            </Button>
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
    </div>
  );
}
