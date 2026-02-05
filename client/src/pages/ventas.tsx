import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Product, CashRegister, SaleItemCreate, PaymentCreate, Sale } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, History, Eye, Check, Store, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

const COLOMBIA_TZ = "America/Bogota";

// Helper to parse server date (UTC) and convert to Colombia time
const toColombiaTime = (dateStr: string) => {
  // Ensure the date is treated as UTC
  const utcDate = dateStr.endsWith('Z') ? new Date(dateStr) : new Date(dateStr + 'Z');
  return toZonedTime(utcDate, COLOMBIA_TZ);
};
import { RequireOpening } from "@/components/require-opening";

interface CartItem {
  id: string;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "nequi", label: "Nequi", icon: CreditCard },
  { id: "bold", label: "Bold", icon: CreditCard },
  { id: "daviplata", label: "Daviplata", icon: CreditCard },
];

function VentasContent() {
  const { currentStore, user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<{ method: string; amount: number; registerId: number }[]>([]);
  const [totalToCharge, setTotalToCharge] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [hasOpening, setHasOpening] = useState(false);
  const [activeTab, setActiveTab] = useState("pos");
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  const suppliers = useMemo(() => {
    const supplierSet = new Set(products.map(p => p.supplier).filter(Boolean));
    return Array.from(supplierSet).sort();
  }, [products]);

  const topProducts = useMemo(() => {
    return products
      .filter(p => p.quantity > 0)
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, 8);
  }, [products]);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const loadData = async () => {
    if (!currentStore) return;
    
    try {
      const [productsData, registersData, opening, salesData] = await Promise.all([
        api.getProducts({ storeId: currentStore.id }),
        api.getCashRegisters(currentStore.id, true),
        api.getTodayOpening(currentStore.id),
        api.getSales({ storeId: currentStore.id }),
      ]);
      
      setProducts(productsData);
      setCashRegisters(registersData);
      setHasOpening(!!opening);
      setSalesHistory(salesData);
      
      if (!opening) {
        toast({
          title: "Apertura de caja pendiente",
          description: "Debe realizar la apertura de caja antes de vender",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (selectedSupplier !== "all") {
      filtered = filtered.filter(p => p.supplier === selectedSupplier);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term) ||
          p.supplier?.toLowerCase().includes(term)
      );
    }
    
    if (!searchTerm && selectedSupplier === "all") {
      return [];
    }
    
    return filtered.slice(0, 15);
  }, [products, searchTerm, selectedSupplier]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product_id === product.id);
    
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const newItem: CartItem = {
        id: `item-${Date.now()}-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sale_price,
      };
      setCart([...cart, newItem]);
    }
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const calculatedTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [cart]);

  const finalTotal = useMemo(() => {
    const parsed = parseFloat(totalToCharge);
    return isNaN(parsed) ? calculatedTotal : parsed;
  }, [totalToCharge, calculatedTotal]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const remaining = useMemo(() => {
    return Math.max(0, finalTotal - totalPaid);
  }, [finalTotal, totalPaid]);

  const getRegisterForMethod = (method: string) => {
    return cashRegisters.find(
      (r) => r.payment_method === method && r.register_type === "menor"
    );
  };

  const addPayment = (method: string) => {
    const register = getRegisterForMethod(method);
    if (!register) {
      toast({
        title: "Error",
        description: `No se encontró la caja para ${method}`,
        variant: "destructive",
      });
      return;
    }
    
    const amount = parseFloat(paymentAmount) || remaining;
    if (amount <= 0) return;
    
    setPayments([...payments, { method, amount, registerId: register.id }]);
    setPaymentAmount("");
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast({ title: "Error", description: "El carrito está vacío", variant: "destructive" });
      return;
    }
    if (!hasOpening) {
      toast({ title: "Error", description: "Debe realizar la apertura de caja primero", variant: "destructive" });
      return;
    }
    setTotalToCharge(calculatedTotal.toString());
    setPayments([]);
    setShowPaymentDialog(true);
  };

  const processSale = async () => {
    if (cart.length === 0 || !currentStore) return;

    if (Math.abs(totalPaid - finalTotal) > 0.01) {
      toast({
        title: "Fondos insuficientes",
        description: `Los pagos ($${totalPaid.toLocaleString()}) no cubren el total ($${finalTotal.toLocaleString()})`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const saleItems: SaleItemCreate[] = cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const salePayments: PaymentCreate[] = payments.map((p) => ({
        cash_register_id: p.registerId,
        payment_method: p.method,
        amount: p.amount,
      }));

      await api.createSale({
        store_id: currentStore.id,
        items: saleItems,
        payments: salePayments,
        total_to_charge: finalTotal,
        notes: notes || undefined,
      });

      toast({ title: "Venta exitosa", description: "La venta se ha registrado correctamente" });

      setCart([]);
      setPayments([]);
      setTotalToCharge("");
      setNotes("");
      setShowPaymentDialog(false);
      loadData();
      searchInputRef.current?.focus();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const viewSaleDetails = async (sale: Sale) => {
    try {
      const fullSale = await api.getSale(sale.id);
      setSelectedSale(fullSale);
      setShowSaleDetails(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className={`${!isAdmin ? 'min-h-screen -m-4 md:-m-8 bg-slate-950' : 'container mx-auto'} p-4 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          {!isAdmin && (
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Store className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                {currentStore?.name}
              </span>
            </div>
          )}
          <h1 className={`text-2xl font-bold ${!isAdmin ? 'text-white' : ''}`} data-testid="text-page-title">
            {isAdmin ? `Ventas - ${currentStore?.name}` : 'Punto de Venta'}
          </h1>
        </div>
        {!hasOpening && (
          <Badge variant="destructive" data-testid="badge-no-opening">
            Apertura de caja pendiente
          </Badge>
        )}
      </div>

      {topProducts.length > 0 && (
        <div className={`${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-muted/50 border'} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className={`h-4 w-4 ${!isAdmin ? 'text-emerald-400' : 'text-primary'}`} />
            <span className={`text-sm font-medium ${!isAdmin ? 'text-slate-300' : ''}`}>Productos destacados</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {topProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isAdmin 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                    : 'bg-background hover:bg-accent border'
                }`}
                data-testid={`quick-product-${product.id}`}
              >
                {product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full max-w-md grid-cols-2 ${!isAdmin ? 'bg-slate-800' : ''}`}>
          <TabsTrigger value="pos" className={`flex items-center gap-2 ${!isAdmin ? 'data-[state=active]:bg-emerald-600 data-[state=active]:text-white' : ''}`} data-testid="tab-pos">
            <ShoppingCart className="h-4 w-4" />
            Punto de Venta
          </TabsTrigger>
          <TabsTrigger value="history" className={`flex items-center gap-2 ${!isAdmin ? 'data-[state=active]:bg-emerald-600 data-[state=active]:text-white' : ''}`} data-testid="tab-history">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'}`}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : 'text-primary'}`} />
                    <span className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>Buscar Producto</span>
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <Input
                      ref={searchInputRef}
                      placeholder="Escriba nombre, marca o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`text-lg h-12 flex-1 ${!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}`}
                      data-testid="input-search-product"
                      autoFocus
                    />
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger className={`w-40 h-12 ${!isAdmin ? 'bg-slate-800 border-slate-700 text-white' : ''}`} data-testid="select-supplier">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier} value={supplier || ''}>
                            {supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredProducts.length > 0 && (
                    <div className={`border rounded-lg max-h-80 overflow-y-auto ${!isAdmin ? 'border-slate-700' : ''}`}>
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-3 cursor-pointer border-b last:border-b-0 ${
                            !isAdmin 
                              ? 'hover:bg-slate-800 border-slate-700' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => addToCart(product)}
                          data-testid={`row-product-${product.id}`}
                        >
                          <div>
                            <p className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>{product.name}</p>
                            <p className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                              {product.brand} • Stock: {product.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${!isAdmin ? 'text-emerald-400' : ''}`}>${product.sale_price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : ''}`} />
                      <span className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>Carrito</span>
                    </div>
                    <Badge variant="secondary" className={!isAdmin ? 'bg-slate-700 text-white' : ''}>{cart.length} items</Badge>
                  </div>
                  
                  {cart.length === 0 ? (
                    <p className={`text-center py-8 ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`} data-testid="text-empty-cart">
                      Carrito vacío - Busque un producto arriba
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg ${!isAdmin ? 'bg-slate-800/50' : 'bg-muted/50'}`}
                          data-testid={`cart-item-${item.id}`}
                        >
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${!isAdmin ? 'text-white' : ''}`}>{item.product_name}</p>
                            <p className={`text-xs ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                              ${item.unit_price.toLocaleString()} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className={`h-8 w-8 ${!isAdmin ? 'border-slate-600 text-white hover:bg-slate-700' : ''}`}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className={`w-14 h-8 text-center ${!isAdmin ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
                              data-testid={`input-quantity-${item.id}`}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className={`h-8 w-8 ${!isAdmin ? 'border-slate-600 text-white hover:bg-slate-700' : ''}`}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFromCart(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className={`font-bold ml-2 w-24 text-right ${!isAdmin ? 'text-white' : ''}`}>
                            ${(item.unit_price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`mt-4 pt-4 border-t ${!isAdmin ? 'border-slate-700' : ''}`}>
                    <div className={`flex justify-between items-center text-2xl font-bold ${!isAdmin ? 'text-white' : ''}`}>
                      <span>TOTAL:</span>
                      <span data-testid="text-total" className={!isAdmin ? 'text-emerald-400' : ''}>${calculatedTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    className={`w-full mt-4 h-14 text-xl ${!isAdmin ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                    size="lg"
                    onClick={openPaymentDialog}
                    disabled={cart.length === 0 || !hasOpening}
                    data-testid="button-pay"
                  >
                    <CreditCard className="h-6 w-6 mr-2" />
                    COBRAR
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'}`}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : ''}`} />
                <span className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>Historial de Ventas de Hoy</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className={!isAdmin ? 'border-slate-700' : ''}>
                    <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Hora</TableHead>
                    <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Productos</TableHead>
                    <TableHead className={`text-center ${!isAdmin ? 'text-slate-400' : ''}`}>Total</TableHead>
                    <TableHead className={`text-center ${!isAdmin ? 'text-slate-400' : ''}`}>Método de Pago</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((sale, index) => {
                    const paymentMethods = sale.payments?.map(p => {
                      const methodLabels: Record<string, string> = {
                        'efectivo': 'Efectivo',
                        'nequi': 'Nequi',
                        'daviplata': 'Daviplata',
                        'bold': 'Bold',
                        'transferencia': 'Transferencia'
                      };
                      return methodLabels[p.payment_method] || p.payment_method;
                    }) || [];
                    const uniqueMethods = Array.from(new Set(paymentMethods));
                    const productsSummary = sale.items?.slice(0, 2).map(item => item.product_name).join(", ") || "";
                    const hasMore = (sale.items?.length || 0) > 2;
                    
                    // Check if this is a new day compared to previous sale
                    const currentDate = format(toColombiaTime(sale.created_at), "yyyy-MM-dd");
                    const prevSale = index > 0 ? salesHistory[index - 1] : null;
                    const prevDate = prevSale ? format(toColombiaTime(prevSale.created_at), "yyyy-MM-dd") : null;
                    const isNewDay = index === 0 || currentDate !== prevDate;
                    
                    return (
                      <>
                        {isNewDay && (
                          <TableRow key={`separator-${sale.id}`} className={!isAdmin ? 'border-slate-700' : ''}>
                            <TableCell colSpan={5} className="py-2">
                              <span className={`text-xs font-medium capitalize ${!isAdmin ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {format(toColombiaTime(sale.created_at), "EEEE, d 'de' MMMM", { locale: es })}
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`} className={!isAdmin ? 'border-slate-700' : ''}>
                          <TableCell className={!isAdmin ? 'text-slate-300' : ''}>{format(toColombiaTime(sale.created_at), "h:mm a", { locale: es })}</TableCell>
                          <TableCell className={`max-w-[200px] truncate ${!isAdmin ? 'text-white' : ''}`}>
                            {productsSummary}{hasMore ? ` (+${(sale.items?.length || 0) - 2} más)` : ""}
                          </TableCell>
                          <TableCell className={`text-center font-bold ${!isAdmin ? 'text-white' : ''}`}>
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {uniqueMethods.map((method, idx) => (
                                <span 
                                  key={idx} 
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    method === 'Efectivo' 
                                      ? (!isAdmin ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                                      : method === 'Nequi'
                                        ? (!isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700')
                                        : (!isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                                  }`}
                                >
                                  {method}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => viewSaleDetails(sale)} className={!isAdmin ? 'text-slate-400 hover:text-white' : ''}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })}
                  {salesHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className={`text-center py-8 ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                        No hay ventas registradas hoy
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className={`max-w-lg ${!isAdmin ? 'bg-slate-900 border-slate-700 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`text-xl ${!isAdmin ? 'text-white' : ''}`}>Procesar Pago</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${!isAdmin ? 'bg-slate-800' : 'bg-muted'}`}>
              <label className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>Total calculado</label>
              <p className={`text-lg ${!isAdmin ? 'text-white' : ''}`}>${calculatedTotal.toLocaleString()}</p>
            </div>

            <div>
              <label className={`text-sm font-medium ${!isAdmin ? 'text-white' : ''}`}>TOTAL A COBRAR</label>
              <Input
                type="number"
                value={totalToCharge}
                onChange={(e) => setTotalToCharge(e.target.value)}
                className={`text-2xl h-14 font-bold text-center ${!isAdmin ? 'bg-slate-800 border-slate-600 text-white' : ''}`}
                placeholder={calculatedTotal.toString()}
                data-testid="input-total-to-charge"
              />
              <p className={`text-xs mt-1 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                Escriba el monto final que cobrará al cliente
              </p>
            </div>

            <div className={`border-t pt-4 ${!isAdmin ? 'border-slate-700' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  type="number"
                  placeholder="Monto"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className={`flex-1 ${!isAdmin ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : ''}`}
                  data-testid="input-payment-amount"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.id}
                    variant="outline"
                    className={`h-14 text-lg ${!isAdmin ? 'border-slate-600 text-white hover:bg-slate-700' : ''}`}
                    onClick={() => addPayment(method.id)}
                    data-testid={`button-method-${method.id}`}
                  >
                    <method.icon className="h-5 w-5 mr-2" />
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {payments.length > 0 && (
              <div className="space-y-2">
                <label className={`text-sm font-medium ${!isAdmin ? 'text-white' : ''}`}>Pagos registrados:</label>
                {payments.map((p, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded ${!isAdmin ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-green-50'}`}>
                    <span className={`capitalize ${!isAdmin ? 'text-emerald-300' : ''}`}>{p.method}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${!isAdmin ? 'text-white' : ''}`}>${p.amount.toLocaleString()}</span>
                      <Button size="icon" variant="ghost" className={`h-6 w-6 ${!isAdmin ? 'text-slate-400 hover:text-white' : ''}`} onClick={() => removePayment(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`p-4 rounded-lg space-y-2 ${!isAdmin ? 'bg-slate-800' : 'bg-muted'}`}>
              <div className={`flex justify-between ${!isAdmin ? 'text-slate-300' : ''}`}>
                <span>Total a cobrar:</span>
                <span className={`font-bold ${!isAdmin ? 'text-white' : ''}`}>${finalTotal.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between ${!isAdmin ? 'text-slate-300' : ''}`}>
                <span>Total pagado:</span>
                <span className={`font-bold ${!isAdmin ? 'text-white' : ''}`}>${totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className={!isAdmin ? 'text-slate-300' : ''}>Restante:</span>
                <span className={`font-bold ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} data-testid="button-cancel-payment" className={!isAdmin ? 'border-slate-600 text-white hover:bg-slate-700' : ''}>
              Cancelar
            </Button>
            <Button
              onClick={processSale}
              disabled={isProcessing || remaining > 0.01}
              className={`h-12 text-lg px-8 ${!isAdmin ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
              data-testid="button-confirm-sale"
            >
              {isProcessing ? "Procesando..." : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  CONFIRMAR VENTA
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaleDetails} onOpenChange={setShowSaleDetails}>
        <DialogContent className={`max-w-lg ${!isAdmin ? 'bg-slate-900 border-slate-700 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={!isAdmin ? 'text-white' : ''}>Detalle de Venta</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}>No. Venta:</span>
                  <p className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>{selectedSale.sale_number}</p>
                </div>
                <div>
                  <span className={!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}>Fecha:</span>
                  <p className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>
                    {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-2 ${!isAdmin ? 'text-white' : ''}`}>Productos:</h4>
                <Table>
                  <TableHeader>
                    <TableRow className={!isAdmin ? 'border-slate-700' : ''}>
                      <TableHead className={!isAdmin ? 'text-slate-400' : ''}>Producto</TableHead>
                      <TableHead className={`text-center ${!isAdmin ? 'text-slate-400' : ''}`}>Cant.</TableHead>
                      <TableHead className={`text-right ${!isAdmin ? 'text-slate-400' : ''}`}>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id} className={!isAdmin ? 'border-slate-700' : ''}>
                        <TableCell className={!isAdmin ? 'text-white' : ''}>{item.product_name}</TableCell>
                        <TableCell className={`text-center ${!isAdmin ? 'text-slate-300' : ''}`}>{item.quantity}</TableCell>
                        <TableCell className={`text-right ${!isAdmin ? 'text-white' : ''}`}>{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className={`p-4 rounded-lg space-y-2 ${!isAdmin ? 'bg-slate-800' : 'bg-muted'}`}>
                <div className={`flex justify-between ${!isAdmin ? 'text-slate-300' : ''}`}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className={`flex justify-between font-bold text-lg ${!isAdmin ? 'text-white' : ''}`}>
                  <span>Total Cobrado:</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-green-500 font-medium">
                  <span>Ganancia:</span>
                  <span>{formatCurrency(selectedSale.profit)}</span>
                </div>
              </div>

              <div>
                <h4 className={`font-medium mb-2 ${!isAdmin ? 'text-white' : ''}`}>Pagos:</h4>
                {selectedSale.payments.map((p) => (
                  <div key={p.id} className={`flex justify-between text-sm ${!isAdmin ? 'text-slate-300' : ''}`}>
                    <span className="capitalize">{p.payment_method}</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VentasPage() {
  return (
    <RequireOpening>
      <VentasContent />
    </RequireOpening>
  );
}
