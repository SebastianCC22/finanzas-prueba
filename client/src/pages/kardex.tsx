import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Product, KardexSummary, StockAdjustment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Package, Search, ArrowUpCircle, ArrowDownCircle, 
  TrendingUp, TrendingDown, Filter, Plus, Minus, ClipboardList, Download
} from "lucide-react";

const ADJUSTMENT_REASONS = [
  { id: "inventario_fisico", label: "Conteo de inventario físico" },
  { id: "faltante", label: "Faltante detectado" },
  { id: "sobrante", label: "Sobrante encontrado" },
  { id: "dano", label: "Producto dañado" },
  { id: "vencimiento", label: "Producto vencido" },
  { id: "devolucion_proveedor", label: "Devolución a proveedor" },
  { id: "otro", label: "Otro motivo" },
];

const ENTRY_TYPES = ["entrada", "compra", "devolucion_cliente", "ajuste_positivo", "traspaso_entrada"];
const EXIT_TYPES = ["venta", "salida", "ajuste_negativo", "traspaso_salida", "devolucion_proveedor"];

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  venta: { label: "Venta", color: "text-rose-600" },
  compra: { label: "Compra", color: "text-emerald-600" },
  entrada: { label: "Entrada", color: "text-emerald-600" },
  salida: { label: "Salida", color: "text-rose-600" },
  ajuste_positivo: { label: "Ajuste (+)", color: "text-blue-600" },
  ajuste_negativo: { label: "Ajuste (-)", color: "text-amber-600" },
  traspaso_entrada: { label: "Traspaso (Entrada)", color: "text-emerald-600" },
  traspaso_salida: { label: "Traspaso (Salida)", color: "text-rose-600" },
  devolucion_cliente: { label: "Devolución Cliente", color: "text-emerald-600" },
  devolucion_proveedor: { label: "Devolución Proveedor", color: "text-rose-600" },
};

export default function Kardex() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [kardex, setKardex] = useState<KardexSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);

  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"entrada" | "salida">("entrada");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadProducts();
    }
  }, [currentStore]);

  useEffect(() => {
    if (selectedProductId) {
      loadKardex();
    }
  }, [selectedProductId, startDate, endDate]);

  const loadProducts = async () => {
    if (!currentStore) return;
    try {
      const data = await api.getProducts({ storeId: currentStore.id });
      setProducts(data);
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

  const loadKardex = async () => {
    if (!selectedProductId) return;
    setIsLoadingKardex(true);
    try {
      const data = await api.getProductKardex(selectedProductId, startDate || undefined, endDate || undefined);
      setKardex(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingKardex(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 20);
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
  }, [products, searchTerm]);

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    setSearchTerm("");
  };

  const openAdjustDialog = (type: "entrada" | "salida") => {
    setAdjustmentType(type);
    setAdjustmentQuantity(1);
    setAdjustmentReason("");
    setCustomReason("");
    setShowAdjustDialog(true);
  };

  const handleAdjust = async () => {
    if (!selectedProductId) return;
    
    const finalReason = adjustmentReason === "otro" ? customReason : 
      ADJUSTMENT_REASONS.find(r => r.id === adjustmentReason)?.label || adjustmentReason;
    
    if (!finalReason || finalReason.length < 3) {
      toast({
        title: "Error",
        description: "Debe seleccionar o escribir un motivo válido",
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    try {
      const result = await api.adjustProductStock(selectedProductId, {
        quantity: adjustmentQuantity,
        reason: finalReason,
        adjustment_type: adjustmentType,
      });
      
      toast({
        title: "Ajuste realizado",
        description: `Stock actualizado de ${result.previous_quantity} a ${result.new_quantity} unidades`,
      });
      
      setShowAdjustDialog(false);
      loadKardex();
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getMovementInfo = (type: string) => {
    const info = MOVEMENT_TYPE_LABELS[type] || { label: type, color: "text-gray-600" };
    const isEntry = ENTRY_TYPES.includes(type);
    return { ...info, icon: isEntry ? "in" as const : "out" as const };
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <ClipboardList className="h-8 w-8 text-violet-500" />
          Kardex de Inventario
        </h1>
        <p className="text-muted-foreground mt-1">
          Control detallado de entradas y salidas de productos
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Producto</CardTitle>
            <CardDescription>Busca y selecciona un producto para ver su kardex</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-product"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProductId === product.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                  data-testid={`button-product-${product.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className={`text-xs ${selectedProductId === product.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {product.brand} • {product.supplier}
                      </p>
                    </div>
                    <Badge 
                      variant={selectedProductId === product.id ? "secondary" : "outline"}
                      className={product.quantity <= (product.min_stock || 5) ? "bg-rose-100 text-rose-700" : ""}
                    >
                      {product.quantity}
                    </Badge>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No se encontraron productos
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {selectedProduct ? selectedProduct.name : "Selecciona un producto"}
                </CardTitle>
                {selectedProduct && (
                  <CardDescription>
                    {selectedProduct.brand} • {selectedProduct.supplier}
                  </CardDescription>
                )}
              </div>
              {isAdmin && selectedProduct && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(api.getKardexExportUrl(selectedProductId!, startDate || undefined, endDate || undefined), "_blank")}
                    data-testid="button-export-kardex"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAdjustDialog("entrada")}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    data-testid="button-adjust-entry"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Entrada
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAdjustDialog("salida")}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    data-testid="button-adjust-exit"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Salida
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedProduct ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un producto de la lista para ver su historial de movimientos</p>
              </div>
            ) : isLoadingKardex ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : kardex ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <ArrowUpCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Entradas</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700" data-testid="text-total-entries">
                      {kardex.total_entries}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <ArrowDownCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Salidas</span>
                    </div>
                    <p className="text-2xl font-bold text-rose-700" data-testid="text-total-exits">
                      {kardex.total_exits}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Package className="h-5 w-5" />
                      <span className="text-sm font-medium">Stock Actual</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700" data-testid="text-current-stock">
                      {kardex.current_stock}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Filtrar por fecha:</Label>
                  </div>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                    data-testid="input-start-date"
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                    data-testid="input-end-date"
                  />
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setStartDate(""); setEndDate(""); }}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Fecha</th>
                        <th className="text-left p-3 font-medium">Tipo</th>
                        <th className="text-right p-3 font-medium">Cantidad</th>
                        <th className="text-right p-3 font-medium">Saldo</th>
                        <th className="text-left p-3 font-medium">Motivo / Referencia</th>
                        <th className="text-left p-3 font-medium">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardex.movements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            No hay movimientos registrados
                          </td>
                        </tr>
                      ) : (
                        kardex.movements.map((movement) => {
                          const info = getMovementInfo(movement.movement_type);
                          return (
                            <tr key={movement.id} className="border-t hover:bg-muted/50">
                              <td className="p-3 whitespace-nowrap">
                                {formatDate(movement.created_at)}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {info.icon === "in" ? (
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-rose-500" />
                                  )}
                                  <span className={info.color}>{info.label}</span>
                                </div>
                              </td>
                              <td className={`p-3 text-right font-mono font-bold ${info.icon === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                                {info.icon === "in" ? "+" : "-"}{movement.quantity}
                              </td>
                              <td className="p-3 text-right font-mono">
                                {movement.new_quantity ?? "-"}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {movement.reason || movement.reference_type || "-"}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {movement.user_name || "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "entrada" ? "Registrar Entrada" : "Registrar Salida"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} - Stock actual: {selectedProduct?.quantity} unidades
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                data-testid="input-adjustment-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                <SelectTrigger data-testid="select-adjustment-reason">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_REASONS.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {adjustmentReason === "otro" && (
              <div className="space-y-2">
                <Label>Especifica el motivo</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe el motivo del ajuste..."
                  data-testid="textarea-custom-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={isAdjusting || adjustmentQuantity <= 0 || !adjustmentReason}
              className={adjustmentType === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              data-testid="button-confirm-adjustment"
            >
              {isAdjusting ? "Procesando..." : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
