import { useStore, PRODUCT_PRESENTATIONS, ProductPresentation } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Pencil, Trash2, Lock, ShieldCheck, ReceiptText, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const productSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  price: z.coerce.number().min(0, "El precio debe ser positivo"),
  hasIva: z.boolean().default(false),
  supplier: z.string().min(1, "El proveedor es requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  quantity: z.coerce.number().min(0, "La cantidad debe ser positiva"),
  presentation: z.enum(['unidad', 'jarabe', 'liquido', 'polvo', 'tabletas', 'capsulas', 'crema', 'otro']),
  weight: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Ingrese la contraseña"),
});

export default function Inventario() {
  const { getStoreProducts, addProduct, updateProduct, deleteProduct, validateAdminPassword } = useStore();
  const products = getStoreProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPresentation, setFilterPresentation] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 0,
      hasIva: false,
      supplier: "",
      brand: "",
      quantity: 1,
      presentation: "unidad",
      weight: "",
    },
  });

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(products.map(p => p.supplier))).sort();
  }, [products]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand))).filter(Boolean).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPresentation = filterPresentation === "all" || p.presentation === filterPresentation;
      const matchesSupplier = filterSupplier === "all" || p.supplier === filterSupplier;
      const matchesBrand = filterBrand === "all" || p.brand === filterBrand;
      
      return matchesSearch && matchesPresentation && matchesSupplier && matchesBrand;
    });
  }, [products, searchTerm, filterPresentation, filterSupplier, filterBrand]);

  const hasActiveFilters = filterPresentation !== "all" || filterSupplier !== "all" || filterBrand !== "all";

  function clearFilters() {
    setFilterPresentation("all");
    setFilterSupplier("all");
    setFilterBrand("all");
    setSearchTerm("");
  }

  function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    if (validateAdminPassword(values.password)) {
      setIsAuthenticated(true);
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al inventario",
      });
    } else {
      toast({
        title: "Contraseña incorrecta",
        description: "Intente nuevamente",
        variant: "destructive",
      });
    }
    passwordForm.reset();
  }

  function onProductSubmit(values: z.infer<typeof productSchema>) {
    const productData = {
      ...values,
      weight: values.weight || undefined,
    };
    
    if (editingId) {
      updateProduct(editingId, productData);
      toast({
        title: "Producto actualizado",
        description: `${values.name} ha sido actualizado`,
      });
    } else {
      addProduct(productData);
      toast({
        title: "Producto agregado",
        description: `${values.name} ha sido agregado al inventario`,
      });
    }
    setIsProductDialogOpen(false);
    setEditingId(null);
    productForm.reset();
  }

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    productForm.reset({
      name: product.name,
      price: product.price,
      hasIva: product.hasIva,
      supplier: product.supplier,
      brand: product.brand || "",
      quantity: product.quantity || 1,
      presentation: product.presentation || "unidad",
      weight: product.weight || "",
    });
    setIsProductDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    productForm.reset({
      name: "",
      price: 0,
      hasIva: false,
      supplier: "",
      brand: "",
      quantity: 1,
      presentation: "unidad",
      weight: "",
    });
    setIsProductDialogOpen(true);
  };

  const handleDelete = (productId: string) => {
    const product = products.find(p => p.id === productId);
    deleteProduct(productId);
    toast({
      title: "Producto eliminado",
      description: `${product?.name} ha sido eliminado del inventario`,
    });
    setDeleteConfirmId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPresentationLabel = (presentation: ProductPresentation) => {
    return PRODUCT_PRESENTATIONS.find(p => p.id === presentation)?.label || presentation;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Área de Administrador</CardTitle>
            <CardDescription>
              El inventario está protegido. Ingrese la contraseña de administrador para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Acceder al Inventario
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-amber-500" />
            Inventario
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona tus productos y precios</p>
        </div>
        
        <Button onClick={handleAddNew} className="gap-2 bg-amber-600 hover:bg-amber-700 shadow-lg">
          <Plus className="h-4 w-4" /> Agregar Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Lista de Productos</CardTitle>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-products"
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
                  {PRODUCT_PRESENTATIONS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueSuppliers.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueBrands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
                {searchTerm || hasActiveFilters ? (
                  <p>No se encontraron productos con los filtros aplicados</p>
                ) : (
                  <p>No hay productos registrados. Agrega el primero.</p>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl transition-all group",
                    product.hasIva 
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" 
                      : "bg-card hover:bg-muted/30"
                  )}
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border shrink-0",
                      product.hasIva 
                        ? "bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/50 dark:border-blue-700" 
                        : "bg-muted border-border text-muted-foreground"
                    )}>
                      {product.hasIva ? <ReceiptText className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{product.name}</p>
                        {product.hasIva && (
                          <Badge variant="secondary" className="bg-blue-500 text-white text-[10px] px-1.5">
                            IVA
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {getPresentationLabel(product.presentation)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Marca: <span className="font-medium text-foreground">{product.brand}</span></span>
                        <span>•</span>
                        <span>Proveedor: {product.supplier}</span>
                        {product.weight && (
                          <>
                            <span>•</span>
                            <span>Peso: {product.weight}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Cantidad: </span>
                        <span className={cn(
                          "font-medium",
                          product.quantity <= 5 ? "text-red-500" : "text-emerald-600"
                        )}>
                          {product.quantity} unidades
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0">
                    <span className="font-bold font-mono text-lg">
                      {formatCurrency(product.price)}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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

          {products.length > 0 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span>Con IVA</span>
                <div className="h-3 w-3 rounded bg-muted border ml-4" />
                <span>Sin IVA</span>
              </div>
              <span>{filteredProducts.length} de {products.length} productos</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Producto' : 'Agregar Producto'}</DialogTitle>
            <DialogDescription>
              Complete los datos del producto. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4 py-4">
              <FormField
                control={productForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Acetaminofén 500mg" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: MK" {...field} data-testid="input-product-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Tecnoquímicas" {...field} data-testid="input-product-supplier" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} className="font-mono" data-testid="input-product-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} className="font-mono" data-testid="input-product-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="presentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presentación *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-presentation">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_PRESENTATIONS.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={productForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso/Volumen</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 500ml, 100g" {...field} data-testid="input-product-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={productForm.control}
                name="hasIva"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Producto con IVA</FormLabel>
                      <FormDescription>
                        Marcar si este producto incluye impuesto IVA
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-product-iva"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" data-testid="button-submit-product">
                {editingId ? 'Guardar Cambios' : 'Agregar Producto'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} 
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
