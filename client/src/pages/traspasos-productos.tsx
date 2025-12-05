import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Product, Store, ProductTransfer } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRight, Package, History, Download } from "lucide-react";
import { format } from "date-fns";

export default function TraspasosProductos() {
  const { currentStore, stores } = useAuthStore();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<ProductTransfer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toStoreId, setToStoreId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [productsData, transfersData] = await Promise.all([
        api.getProducts({ storeId: currentStore.id }),
        api.getProductTransfers({ fromStoreId: currentStore.id }),
      ]);
      setProducts(productsData);
      setTransfers(transfersData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20);

  const otherStores = stores.filter((s) => s.id !== currentStore?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !toStoreId || !quantity) {
      toast({
        title: "Error",
        description: "Seleccione un producto, tienda destino y cantidad",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0 || qty > selectedProduct.quantity) {
      toast({
        title: "Error",
        description: "Cantidad inválida",
        variant: "destructive",
      });
      return;
    }

    if (!currentStore) return;

    setIsSubmitting(true);
    try {
      await api.createProductTransfer({
        product_id: selectedProduct.id,
        from_store_id: currentStore.id,
        to_store_id: parseInt(toStoreId),
        quantity: qty,
        reason,
      });

      toast({
        title: "Traspaso exitoso",
        description: "El producto se ha transferido correctamente",
      });

      setSelectedProduct(null);
      setToStoreId("");
      setQuantity("");
      setReason("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        Traspasos de Productos - {currentStore?.name}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nuevo Traspaso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Producto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                {searchTerm && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-2 cursor-pointer hover:bg-muted ${
                          selectedProduct?.id === product.id ? "bg-muted" : ""
                        }`}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchTerm("");
                        }}
                        data-testid={`product-option-${product.id}`}
                      >
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {product.quantity} - {product.brand}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock disponible: {selectedProduct.quantity}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tienda Destino *</Label>
                <Select value={toStoreId} onValueChange={setToStoreId}>
                  <SelectTrigger data-testid="select-store">
                    <SelectValue placeholder="Seleccionar tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherStores.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={selectedProduct?.quantity || 0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  data-testid="input-quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo del traspaso..."
                  data-testid="input-reason"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !selectedProduct}
                data-testid="button-submit"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isSubmitting ? "Procesando..." : "Realizar Traspaso"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Traspasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                      <TableCell>
                        {format(new Date(transfer.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        #{transfer.product_id}
                      </TableCell>
                      <TableCell>
                        {stores.find((s) => s.id === transfer.to_store_id)?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{transfer.quantity}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
