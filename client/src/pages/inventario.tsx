import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Product, ProductCreate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Search, Pencil, Trash2, Filter, X, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESENTATIONS = [
  { id: "unidad", label: "Unidad" },
  { id: "jarabe", label: "Jarabe" },
  { id: "liquido", label: "Líquido" },
  { id: "polvo", label: "Polvo" },
  { id: "tabletas", label: "Tabletas" },
  { id: "capsulas", label: "Cápsulas" },
  { id: "crema", label: "Crema" },
  { id: "otro", label: "Otro" },
];

export default function Inventario() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPresentation, setFilterPresentation] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<ProductCreate>>({
    name: "",
    sale_price: 0,
    cost: 0,
    has_iva: false,
    supplier: "",
    brand: "",
    quantity: 1,
    min_stock: 5,
    presentation: "unidad",
    weight_volume: "",
  });

  useEffect(() => {
    if (currentStore) {
      loadProducts();
    }
  }, [currentStore]);

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

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.supplier).filter(Boolean))).sort();
  }, [products]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPresentation = filterPresentation === "all" || p.presentation === filterPresentation;
      const matchesSupplier = filterSupplier === "all" || p.supplier === filterSupplier;
      const matchesBrand = filterBrand === "all" || p.brand === filterBrand;
      const matchesOutOfStock = !filterOutOfStock || p.quantity === 0;

      return matchesSearch && matchesPresentation && matchesSupplier && matchesBrand && matchesOutOfStock;
    });
  }, [products, searchTerm, filterPresentation, filterSupplier, filterBrand, filterOutOfStock]);

  const hasActiveFilters = filterPresentation !== "all" || filterSupplier !== "all" || filterBrand !== "all" || filterOutOfStock;

  const clearFilters = () => {
    setFilterPresentation("all");
    setFilterSupplier("all");
    setFilterBrand("all");
    setFilterOutOfStock(false);
    setSearchTerm("");
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sale_price: 0,
      cost: 0,
      has_iva: false,
      supplier: "",
      brand: "",
      quantity: 1,
      min_stock: 5,
      presentation: "unidad",
      weight_volume: "",
    });
    setIsProductDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sale_price: product.sale_price,
      cost: product.cost || 0,
      has_iva: product.has_iva,
      supplier: product.supplier || "",
      brand: product.brand || "",
      quantity: product.quantity,
      min_stock: product.min_stock,
      presentation: product.presentation || "unidad",
      weight_volume: product.weight_volume || "",
    });
    setIsProductDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentStore || !formData.name || !formData.sale_price) {
      toast({
        title: "Error",
        description: "Nombre y precio de venta son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        toast({
          title: "Producto actualizado",
          description: `${formData.name} ha sido actualizado`,
        });
      } else {
        await api.createProduct({
          ...formData,
          store_id: currentStore.id,
        } as ProductCreate);
        toast({
          title: "Producto agregado",
          description: `${formData.name} ha sido agregado al inventario`,
        });
      }
      setIsProductDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      await api.deleteProduct(productId);
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del inventario",
      });
      setDeleteConfirmId(null);
      loadProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportInventory = async () => {
    if (!currentStore) return;
    setIsExporting(true);
    try {
      const blob = await api.exportInventory(currentStore.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${currentStore.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Exportación completada",
        description: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error al exportar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder al inventario.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Package className="h-8 w-8 text-amber-500" />
            Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los productos de {currentStore?.name}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportInventory} 
            disabled={isExporting}
            data-testid="button-export"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar Excel
              </>
            )}
          </Button>
          <Button onClick={handleAddNew} className="bg-amber-600 hover:bg-amber-700" data-testid="button-add">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Lista de Productos ({filteredProducts.length})</CardTitle>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterPresentation} onValueChange={setFilterPresentation}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Presentación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PRESENTATIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueSuppliers.map((s) => (
                    <SelectItem key={s} value={s!}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueBrands.map((b) => (
                    <SelectItem key={b} value={b!}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={filterOutOfStock ? "destructive" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setFilterOutOfStock(!filterOutOfStock)}
                data-testid="button-filter-out-of-stock"
              >
                <AlertTriangle className="h-3 w-3" />
                Agotados
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                  <X className="h-3 w-3" /> Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl transition-all group",
                    product.has_iva
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                      : "bg-card hover:bg-muted/30"
                  )}
                  data-testid={`product-${product.id}`}
                >
                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border shrink-0",
                        product.has_iva
                          ? "bg-blue-100 border-blue-200 text-blue-600"
                          : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{product.name}</p>
                        {product.has_iva && (
                          <Badge variant="secondary" className="bg-blue-500 text-white text-[10px]">
                            IVA
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {PRESENTATIONS.find((p) => p.id === product.presentation)?.label || product.presentation}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Marca: <span className="font-medium text-foreground">{product.brand}</span>
                        </span>
                        <span>• Proveedor: {product.supplier}</span>
                        {product.weight_volume && <span>• {product.weight_volume}</span>}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Stock: </span>
                        <span
                          className={cn(
                            "font-medium",
                            product.quantity <= (product.min_stock || 5) ? "text-red-500" : "text-emerald-600"
                          )}
                        >
                          {product.quantity} unidades
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0">
                    <div className="text-right">
                      <span className="font-bold font-mono text-lg block">{formatCurrency(product.sale_price)}</span>
                      <span className="text-xs text-muted-foreground">Costo: {formatCurrency(product.cost || 0)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteConfirmId(product.id)}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
            <DialogDescription>Complete los datos del producto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del producto"
                data-testid="input-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Marca"
                  data-testid="input-brand"
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Proveedor"
                  data-testid="input-supplier"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio Venta *</Label>
                <Input
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-sale-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Costo</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-cost-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  placeholder="1"
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  placeholder="5"
                  data-testid="input-min-stock"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presentación</Label>
                <Select
                  value={formData.presentation}
                  onValueChange={(v) => setFormData({ ...formData, presentation: v })}
                >
                  <SelectTrigger data-testid="select-presentation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESENTATIONS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Peso/Volumen</Label>
                <Input
                  value={formData.weight_volume}
                  onChange={(e) => setFormData({ ...formData, weight_volume: e.target.value })}
                  placeholder="Ej: 500ml"
                  data-testid="input-weight"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Producto con IVA</Label>
                <p className="text-xs text-muted-foreground">Marcar si incluye impuesto</p>
              </div>
              <Switch
                checked={formData.has_iva}
                onCheckedChange={(v) => setFormData({ ...formData, has_iva: v })}
                data-testid="switch-iva"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} data-testid="button-save">
              {editingProduct ? "Guardar Cambios" : "Agregar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
