import { useStore, TransactionType, PaymentMethod, Product, PRODUCT_PRESENTATIONS } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowUpCircle, ArrowDownCircle, Calendar as CalendarIcon, Trash2, Plus, Pencil, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, Search, Package, X } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const transactionSchema = z.object({
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  method: z.enum(['Efectivo', 'Nequi', 'Daviplata', 'Bolt']),
  description: z.string().min(2, "Descripción requerida"),
  accountId: z.string().min(1, "Seleccione una cuenta"),
  date: z.date(),
  productId: z.string().optional(),
});

interface MovementsPageProps {
  type: TransactionType;
}

export default function Movements({ type }: MovementsPageProps) {
  const { getStoreTransactions, getTodayTransactions, getStoreAccounts, getStoreProducts, addTransaction, updateTransaction, deleteTransaction } = useStore();
  const allTransactions = getStoreTransactions();
  const todayTransactions = getTodayTransactions();
  const accounts = getStoreAccounts();
  const products = getStoreProducts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  
  const isIncome = type === 'ingreso';
  const filteredTransactions = allTransactions.filter(t => t.type === type);
  const todayFiltered = todayTransactions.filter(t => t.type === type);
  
  const totalAmount = todayFiltered.reduce((sum, t) => sum + t.amount, 0);
  
  const incomeByMethod = todayFiltered.reduce((acc, t) => {
    acc[t.method] = (acc[t.method] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(incomeByMethod).map(([name, value]) => ({ name, value }));
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10);
    const search = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search) ||
      p.supplier.toLowerCase().includes(search) ||
      p.presentation.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [products, productSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      method: 'Efectivo',
      description: "",
      accountId: "",
      date: new Date(),
      productId: "",
    },
  });

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductDropdown(false);
    form.setValue("description", `Venta: ${product.name} (${product.brand})`);
    form.setValue("amount", product.price);
    form.setValue("productId", product.id);
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
    setProductSearch("");
    form.setValue("description", "");
    form.setValue("amount", 0);
    form.setValue("productId", "");
  };

  const onSubmit = (values: z.infer<typeof transactionSchema>) => {
    const txData = {
      type,
      amount: values.amount,
      method: values.method as PaymentMethod,
      description: values.description,
      accountId: values.accountId,
      date: values.date.toISOString(),
      productId: values.productId,
    };

    if (editingId) {
      updateTransaction(editingId, txData);
    } else {
      addTransaction(txData);
    }
    
    setIsDialogOpen(false);
    setEditingId(null);
    setSelectedProduct(null);
    setProductSearch("");
    form.reset({
      amount: 0,
      method: 'Efectivo',
      description: "",
      accountId: "",
      date: new Date(),
      productId: "",
    });
  };

  const handleEdit = (tx: any) => {
    setEditingId(tx.id);
    const linkedProduct = tx.productId ? products.find(p => p.id === tx.productId) : null;
    setSelectedProduct(linkedProduct || null);
    setProductSearch(linkedProduct?.name || "");
    form.reset({
      amount: tx.amount,
      method: tx.method,
      description: tx.description,
      accountId: tx.accountId,
      date: new Date(tx.date),
      productId: tx.productId || "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setSelectedProduct(null);
    setProductSearch("");
    form.reset({
      amount: 0,
      method: 'Efectivo',
      description: "",
      accountId: "",
      date: new Date(),
      productId: "",
    });
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPresentationLabel = (presentation: string) => {
    return PRODUCT_PRESENTATIONS.find(p => p.id === presentation)?.label || presentation;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {isIncome ? (
              <ArrowUpCircle className="h-8 w-8 text-emerald-500" />
            ) : (
              <ArrowDownCircle className="h-8 w-8 text-rose-500" />
            )}
            Gestión de {isIncome ? 'Ingresos' : 'Egresos'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen y control de {isIncome ? 'entradas' : 'salidas'}
          </p>
        </div>
        
        <Button 
          onClick={handleAddNew}
          className={cn(
            "gap-2 shadow-lg h-12 px-6",
            isIncome ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
          )}
        >
          <Plus className="h-5 w-5" /> 
          Nuevo {isIncome ? 'Ingreso' : 'Egreso'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 bg-gradient-to-br from-card to-accent/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total {isIncome ? 'Recaudado' : 'Gastado'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold font-mono", isIncome ? "text-emerald-600" : "text-rose-600")}>
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En {filteredTransactions.length} movimientos
            </p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribución por Método
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[140px] flex items-center">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} interval={0} />
                   <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} />
                   <Bar dataKey="value" fill={isIncome ? "hsl(160 60% 45%)" : "hsl(0 84.2% 60.2%)"} radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="w-full text-center text-muted-foreground text-sm">Sin datos para graficar</div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial Detallado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                No hay movimientos registrados.
              </div>
            ) : (
              filteredTransactions.map((t) => {
                const account = accounts.find(a => a.id === t.accountId);
                const linkedProduct = t.productId ? products.find(p => p.id === t.productId) : null;
                return (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-all group">
                    <div className="flex items-start gap-4 mb-3 sm:mb-0">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border shrink-0",
                        isIncome ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-rose-100 border-rose-200 text-rose-600"
                      )}>
                        {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{t.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="bg-muted px-1.5 py-0.5 rounded">{format(new Date(t.date), "d MMM yyyy", { locale: es })}</span>
                          <span>•</span>
                          <span className="font-medium text-foreground">{t.method}</span>
                          <span>•</span>
                          <span>{account?.name || 'Cuenta eliminada'}</span>
                          {linkedProduct && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-[10px]">
                                <Package className="h-2.5 w-2.5 mr-1" />
                                {linkedProduct.name}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-14 sm:pl-0">
                      <span className={cn("font-bold font-mono text-lg", isIncome ? "text-emerald-600" : "text-rose-600")}>
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTransaction(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Registrar'} {isIncome ? 'Ingreso' : 'Egreso'}</DialogTitle>
            {isIncome && (
              <DialogDescription>
                Busca un producto del inventario para autocompletar o ingresa los datos manualmente.
              </DialogDescription>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {isIncome && products.length > 0 && (
                <div className="space-y-2" ref={productSearchRef}>
                  <label className="text-sm font-medium">Buscar Producto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, marca, proveedor..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                        if (selectedProduct && e.target.value !== selectedProduct.name) {
                          setSelectedProduct(null);
                        }
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="pl-9 pr-9"
                      data-testid="input-search-product-income"
                    />
                    {selectedProduct && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={clearSelectedProduct}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {showProductDropdown && filteredProducts.length > 0 && !selectedProduct && (
                    <Card className="absolute z-50 w-[calc(100%-3rem)] mt-1 shadow-lg">
                      <ScrollArea className="max-h-[200px]">
                        <div className="p-1">
                          {filteredProducts.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => selectProduct(product)}
                              className="w-full text-left p-3 hover:bg-muted rounded-md transition-colors"
                              data-testid={`product-option-${product.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{product.brand}</span>
                                    <span>•</span>
                                    <span>{product.supplier}</span>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {getPresentationLabel(product.presentation)}
                                    </Badge>
                                  </div>
                                </div>
                                <span className="font-mono font-bold text-emerald-600">
                                  {formatCurrency(product.price)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  )}
                  
                  {selectedProduct && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-sm">{selectedProduct.name}</span>
                        {selectedProduct.hasIva && (
                          <Badge className="bg-blue-500 text-[10px]">IVA</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedProduct.brand} • {selectedProduct.supplier} • {getPresentationLabel(selectedProduct.presentation)}
                        {selectedProduct.weight && ` • ${selectedProduct.weight}`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} className="font-mono text-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Nequi">Nequi</SelectItem>
                          <SelectItem value="Daviplata">Daviplata</SelectItem>
                          <SelectItem value="Bolt">Bolt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Venta de producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className={cn("w-full h-11 text-base", isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}>
                {editingId ? 'Actualizar' : 'Guardar'} {isIncome ? 'Ingreso' : 'Egreso'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
