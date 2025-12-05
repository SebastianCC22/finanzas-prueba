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

export default function Devoluciones() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();

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
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        Devoluciones - {currentStore?.name}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Buscar Venta para Devolver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de venta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-sale"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell>
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        ${sale.total.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReturnDialog(sale)}
                          data-testid={`button-return-${sale.id}`}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Devolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Devoluciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Reembolso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret.id} data-testid={`row-return-${ret.id}`}>
                      <TableCell className="font-medium">#{ret.sale_id}</TableCell>
                      <TableCell>
                        <Badge variant={ret.return_type === "total" ? "default" : "secondary"}>
                          {ret.return_type === "total" ? "Total" : "Parcial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ret.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -${ret.total_refund.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procesar Devolución - {selectedSale?.sale_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Devolución</Label>
              <Select
                value={returnType}
                onValueChange={(v) => handleReturnTypeChange(v as "total" | "partial")}
              >
                <SelectTrigger data-testid="select-return-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Devolución Total</SelectItem>
                  <SelectItem value="partial">Devolución Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Productos a Devolver</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Cant. Original</TableHead>
                    <TableHead>Cant. a Devolver</TableHead>
                    <TableHead>Reingresar Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSale?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>${item.final_price.toLocaleString()}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={selectedItems[item.id]?.quantity || 0}
                          onChange={(e) =>
                            updateItemQuantity(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-20"
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

            <div className="space-y-2">
              <Label>Motivo de Devolución *</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ingrese el motivo de la devolución..."
                data-testid="input-return-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={processReturn}
              disabled={isProcessing || !returnReason}
              variant="destructive"
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
