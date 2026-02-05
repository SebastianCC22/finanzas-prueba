import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Sale, Return, SaleItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, RotateCcw, Package, History } from "lucide-react";
import { format } from "date-fns";
import { RequireOpening } from "@/components/require-opening";

function DevolucionesContent() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnType, setReturnType] = useState<"total" | "partial">("total");
  const [returnReason, setReturnReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: { quantity: number; restock: boolean } }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [salesData, returnsData] = await Promise.all([
        api.getSales({ storeId: currentStore.id }),
        api.getReturns({ storeId: currentStore.id }),
      ]);
      setSales(salesData);
      setReturns(returnsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredSales = sales.filter(
    (sale) =>
      sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
      sale.status === "completed"
  );

  const openReturnDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnType("total");
    setReturnReason("");
    const initialItems: { [key: number]: { quantity: number; restock: boolean } } = {};
    sale.items.forEach((item) => {
      initialItems[item.id] = { quantity: item.quantity, restock: true };
    });
    setSelectedItems(initialItems);
    setShowReturnDialog(true);
  };

  const handleReturnTypeChange = (type: "total" | "partial") => {
    setReturnType(type);
    if (type === "total" && selectedSale) {
      const allItems: { [key: number]: { quantity: number; restock: boolean } } = {};
      selectedSale.items.forEach((item) => {
        allItems[item.id] = { quantity: item.quantity, restock: true };
      });
      setSelectedItems(allItems);
    }
  };

  const updateItemQuantity = (itemId: number, quantity: number) => {
    setSelectedItems({
      ...selectedItems,
      [itemId]: { ...selectedItems[itemId], quantity },
    });
  };

  const updateItemRestock = (itemId: number, restock: boolean) => {
    setSelectedItems({
      ...selectedItems,
      [itemId]: { ...selectedItems[itemId], restock },
    });
  };

  const processReturn = async () => {
    if (!selectedSale || !returnReason) {
      toast({
        title: "Error",
        description: "Debe proporcionar un motivo de devolución",
        variant: "destructive",
      });
      return;
    }

    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, data]) => data.quantity > 0)
      .map(([itemId, data]) => ({
        sale_item_id: parseInt(itemId),
        quantity: data.quantity,
        restock: data.restock,
      }));

    if (itemsToReturn.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un producto para devolver",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await api.createReturn({
        sale_id: selectedSale.id,
        return_type: returnType,
        reason: returnReason,
        items: itemsToReturn,
      });

      toast({
        title: "Devolución exitosa",
        description: "La devolución se ha procesado correctamente",
      });

      setShowReturnDialog(false);
      setSelectedSale(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen ${!isAdmin ? '-m-4 md:-m-8 bg-slate-950 p-6' : 'container mx-auto p-4'} space-y-6`}>
      <div className={!isAdmin ? 'max-w-6xl mx-auto' : ''}>
        <h1 className={`text-2xl font-bold ${!isAdmin ? 'text-white' : ''}`} data-testid="text-page-title">
          Devoluciones
        </h1>
        <p className={`text-sm mt-1 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
          {currentStore?.name}
        </p>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${!isAdmin ? 'max-w-6xl mx-auto' : ''}`}>
        <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Package className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : ''}`} />
            <span className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>Buscar Venta</span>
          </div>
          <div className="relative mb-4">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Buscar por número de venta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}`}
              data-testid="input-search-sale"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className={!isAdmin ? 'border-slate-700' : ''}>
                  <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Número</TableHead>
                  <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Fecha</TableHead>
                  <TableHead className={`text-right ${!isAdmin ? 'text-slate-400' : ''}`}>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`} className={!isAdmin ? 'border-slate-700' : ''}>
                    <TableCell className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>{sale.sale_number}</TableCell>
                    <TableCell className={!isAdmin ? 'text-slate-300' : ''}>
                      {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${!isAdmin ? 'text-white' : ''}`}>
                      ${sale.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReturnDialog(sale)}
                        className={!isAdmin ? 'border-slate-600 text-white hover:bg-slate-800' : ''}
                        data-testid={`button-return-${sale.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Devolver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className={`text-center py-8 ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                      No hay ventas disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <History className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : ''}`} />
            <span className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>Historial de Devoluciones</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className={!isAdmin ? 'border-slate-700' : ''}>
                  <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Venta</TableHead>
                  <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Tipo</TableHead>
                  <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Fecha</TableHead>
                  <TableHead className={`text-right ${!isAdmin ? 'text-slate-400' : ''}`}>Reembolso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id} data-testid={`row-return-${ret.id}`} className={!isAdmin ? 'border-slate-700' : ''}>
                    <TableCell className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>#{ret.sale_id}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ret.return_type === "total"
                          ? (!isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                          : (!isAdmin ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700')
                      }`}>
                        {ret.return_type === "total" ? "Total" : "Parcial"}
                      </span>
                    </TableCell>
                    <TableCell className={!isAdmin ? 'text-slate-300' : ''}>
                      {format(new Date(ret.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right text-red-400 font-medium">
                      -${ret.total_refund.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className={`text-center py-8 ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                      No hay devoluciones registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className={`max-w-2xl ${!isAdmin ? 'bg-slate-900 border-slate-700 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={!isAdmin ? 'text-white' : ''}>
              Procesar Devolución - {selectedSale?.sale_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={!isAdmin ? 'text-slate-300' : ''}>Tipo de Devolución</Label>
              <Select
                value={returnType}
                onValueChange={(v) => handleReturnTypeChange(v as "total" | "partial")}
              >
                <SelectTrigger className={!isAdmin ? 'bg-slate-800 border-slate-700 text-white' : ''} data-testid="select-return-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={!isAdmin ? 'bg-slate-800 border-slate-700' : ''}>
                  <SelectItem value="total">Devolución Total</SelectItem>
                  <SelectItem value="partial">Devolución Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={!isAdmin ? 'text-slate-300' : ''}>Productos a Devolver</Label>
              <div className={`rounded-lg overflow-hidden ${!isAdmin ? 'border border-slate-700' : 'border'}`}>
                <Table>
                  <TableHeader>
                    <TableRow className={!isAdmin ? 'border-slate-700 bg-slate-800' : ''}>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Producto</TableHead>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Precio</TableHead>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Original</TableHead>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Devolver</TableHead>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Reingresar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale?.items.map((item) => (
                      <TableRow key={item.id} className={!isAdmin ? 'border-slate-700' : ''}>
                        <TableCell className={!isAdmin ? 'text-white' : ''}>{item.product_name}</TableCell>
                        <TableCell className={!isAdmin ? 'text-slate-300' : ''}>${item.final_price.toLocaleString()}</TableCell>
                        <TableCell className={!isAdmin ? 'text-slate-300' : ''}>{item.quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={selectedItems[item.id]?.quantity || 0}
                            onChange={(e) =>
                              updateItemQuantity(item.id, parseInt(e.target.value) || 0)
                            }
                            className={`w-16 ${!isAdmin ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
                            disabled={returnType === "total"}
                            data-testid={`input-quantity-${item.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems[item.id]?.restock ?? true}
                            onCheckedChange={(checked) =>
                              updateItemRestock(item.id, checked as boolean)
                            }
                            data-testid={`checkbox-restock-${item.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={!isAdmin ? 'text-slate-300' : ''}>Motivo de Devolución *</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ingrese el motivo de la devolución..."
                className={!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}
                data-testid="input-return-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReturnDialog(false)}
              className={!isAdmin ? 'border-slate-600 text-white hover:bg-slate-800' : ''}
            >
              Cancelar
            </Button>
            <Button
              onClick={processReturn}
              disabled={isProcessing || !returnReason}
              className={!isAdmin ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              variant={isAdmin ? "destructive" : "default"}
              data-testid="button-confirm-return"
            >
              {isProcessing ? "Procesando..." : "Confirmar Devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Devoluciones() {
  return (
    <RequireOpening>
      <DevolucionesContent />
    </RequireOpening>
  );
}
