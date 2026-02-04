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
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, History, Eye, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  const { currentStore } = useAuthStore();
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
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.supplier?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [products, searchTerm]);

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
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Ventas - {currentStore?.name}
        </h1>
        {!hasOpening && (
          <Badge variant="destructive" data-testid="badge-no-opening">
            Apertura de caja pendiente
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pos" className="flex items-center gap-2" data-testid="tab-pos">
            <ShoppingCart className="h-4 w-4" />
            Punto de Venta
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Buscar Producto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    ref={searchInputRef}
                    placeholder="Escriba nombre, marca o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-lg h-12"
                    data-testid="input-search-product"
                    autoFocus
                  />
                  {filteredProducts.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => addToCart(product)}
                          data-testid={`row-product-${product.id}`}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.brand} • Stock: {product.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${product.sale_price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Carrito
                  </CardTitle>
                  <Badge variant="secondary">{cart.length} items</Badge>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-empty-cart">
                      Carrito vacío - Busque un producto arriba
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                          data-testid={`cart-item-${item.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${item.unit_price.toLocaleString()} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-14 h-8 text-center"
                              data-testid={`input-quantity-${item.id}`}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
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
                          <p className="font-bold ml-2 w-24 text-right">
                            ${(item.unit_price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-2xl font-bold">
                      <span>TOTAL:</span>
                      <span data-testid="text-total">${calculatedTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 h-14 text-xl"
                    size="lg"
                    onClick={openPaymentDialog}
                    disabled={cart.length === 0 || !hasOpening}
                    data-testid="button-pay"
                  >
                    <CreditCard className="h-6 w-6 mr-2" />
                    COBRAR
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Ventas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Venta</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((sale) => (
                    <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="font-medium">{sale.sale_number}</TableCell>
                      <TableCell>{format(new Date(sale.created_at), "HH:mm", { locale: es })}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(sale.profit)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => viewSaleDetails(sale)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay ventas registradas hoy
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Procesar Pago</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <label className="text-sm text-muted-foreground">Total calculado</label>
              <p className="text-lg">${calculatedTotal.toLocaleString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium">TOTAL A COBRAR</label>
              <Input
                type="number"
                value={totalToCharge}
                onChange={(e) => setTotalToCharge(e.target.value)}
                className="text-2xl h-14 font-bold text-center"
                placeholder={calculatedTotal.toString()}
                data-testid="input-total-to-charge"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Escriba el monto final que cobrará al cliente
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  type="number"
                  placeholder="Monto"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1"
                  data-testid="input-payment-amount"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-14 text-lg"
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
                <label className="text-sm font-medium">Pagos registrados:</label>
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-50 p-2 rounded">
                    <span className="capitalize">{p.method}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">${p.amount.toLocaleString()}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removePayment(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total a cobrar:</span>
                <span className="font-bold">${finalTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total pagado:</span>
                <span className="font-bold">${totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Restante:</span>
                <span className={`font-bold ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} data-testid="button-cancel-payment">
              Cancelar
            </Button>
            <Button
              onClick={processSale}
              disabled={isProcessing || remaining > 0.01}
              className="h-12 text-lg px-8"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">No. Venta:</span>
                  <p className="font-medium">{selectedSale.sale_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Productos:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Cobrado:</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Ganancia:</span>
                  <span>{formatCurrency(selectedSale.profit)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Pagos:</h4>
                {selectedSale.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
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
