import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Product, CashRegister, SaleItemCreate, PaymentCreate, Sale } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Percent, X, Check, History, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CartItem extends SaleItemCreate {
  id: string;
}

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "nequi", label: "Nequi", icon: CreditCard },
  { id: "bold", label: "Bold", icon: CreditCard },
  { id: "daviplata", label: "Daviplata", icon: CreditCard },
];

export default function Ventas() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<{ method: string; amount: number; registerId: number }[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountReason, setGlobalDiscountReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<string | null>(null);
  const [itemDiscount, setItemDiscount] = useState({ amount: 0, percent: 0, reason: "" });
  const [hasOpening, setHasOpening] = useState(false);
  const [activeTab, setActiveTab] = useState("pos");
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

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

  const viewSaleDetails = async (sale: Sale) => {
    try {
      const fullSale = await api.getSale(sale.id);
      setSelectedSale(fullSale);
      setShowSaleDetails(true);
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
    if (!searchTerm) return products.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.supplier?.toLowerCase().includes(term)
    ).slice(0, 20);
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
        original_price: product.sale_price,
        final_price: product.sale_price,
        discount_amount: 0,
        discount_percent: 0,
        discount_reason: "",
        has_iva: product.has_iva,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const openDiscountDialog = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (item) {
      setSelectedItemForDiscount(itemId);
      setItemDiscount({
        amount: item.discount_amount || 0,
        percent: item.discount_percent || 0,
        reason: item.discount_reason || "",
      });
      setShowDiscountDialog(true);
    }
  };

  const applyItemDiscount = () => {
    if (!selectedItemForDiscount) return;
    
    setCart(
      cart.map((item) => {
        if (item.id === selectedItemForDiscount) {
          let finalPrice = item.original_price;
          if (itemDiscount.percent > 0) {
            finalPrice = item.original_price * (1 - itemDiscount.percent / 100);
          } else if (itemDiscount.amount > 0) {
            finalPrice = item.original_price - itemDiscount.amount;
          }
          return {
            ...item,
            final_price: Math.max(0, finalPrice),
            discount_amount: itemDiscount.amount,
            discount_percent: itemDiscount.percent,
            discount_reason: itemDiscount.reason,
          };
        }
        return item;
      })
    );
    
    setShowDiscountDialog(false);
    setSelectedItemForDiscount(null);
    setItemDiscount({ amount: 0, percent: 0, reason: "" });
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.final_price * item.quantity, 0);
  }, [cart]);

  const taxTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.has_iva) {
        return sum + item.final_price * item.quantity * 0.19;
      }
      return sum;
    }, 0);
  }, [cart]);

  const total = useMemo(() => {
    return subtotal - globalDiscount;
  }, [subtotal, globalDiscount]);

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const remaining = useMemo(() => {
    return Math.max(0, total - totalPaid);
  }, [total, totalPaid]);

  const getRegisterForMethod = (method: string) => {
    return cashRegisters.find(
      (r) => r.payment_method === method && r.register_type === "menor"
    );
  };

  const addPayment = (method: string, amount: number) => {
    const register = getRegisterForMethod(method);
    if (!register) {
      toast({
        title: "Error",
        description: `No se encontró la caja para ${method}`,
        variant: "destructive",
      });
      return;
    }
    
    setPayments([...payments, { method, amount, registerId: register.id }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
      });
      return;
    }

    if (!hasOpening) {
      toast({
        title: "Error",
        description: "Debe realizar la apertura de caja primero",
        variant: "destructive",
      });
      return;
    }

    if (totalPaid < total) {
      toast({
        title: "Error",
        description: "El pago no cubre el total de la venta",
        variant: "destructive",
      });
      return;
    }

    if (!currentStore) return;

    setIsProcessing(true);
    try {
      const saleItems: SaleItemCreate[] = cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        original_price: item.original_price,
        final_price: item.final_price,
        discount_amount: item.discount_amount,
        discount_percent: item.discount_percent,
        discount_reason: item.discount_reason,
        has_iva: item.has_iva,
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
        global_discount: globalDiscount,
        global_discount_reason: globalDiscountReason,
        notes,
      });

      toast({
        title: "Venta exitosa",
        description: "La venta se ha registrado correctamente",
      });

      setCart([]);
      setPayments([]);
      setGlobalDiscount(0);
      setGlobalDiscountReason("");
      setNotes("");
      setShowPaymentDialog(false);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Buscar Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, marca o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-product"
                />
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.brand} - {product.presentation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                            {product.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${product.sale_price.toLocaleString()}
                          {product.has_iva && (
                            <span className="text-xs text-blue-500 ml-1">+IVA</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addToCart(product)}
                            disabled={product.quantity === 0}
                            data-testid={`button-add-${product.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                  Carrito vacío
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.final_price.toLocaleString()} x {item.quantity}
                          {item.discount_percent > 0 && (
                            <span className="text-green-500 ml-1">
                              (-{item.discount_percent}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, -1)}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, 1)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openDiscountDialog(item.id)}
                          data-testid={`button-discount-${item.id}`}
                        >
                          <Percent className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA (informativo):</span>
                  <span>${taxTotal.toLocaleString()}</span>
                </div>
                {globalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Descuento global:</span>
                    <span>-${globalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span data-testid="text-total">${total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowPaymentDialog(true)}
                  disabled={cart.length === 0 || !hasOpening}
                  data-testid="button-pay"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar
                </Button>
              </div>
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
                Historial de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay ventas registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesHistory.map((sale) => (
                        <TableRow key={sale.id} data-testid={`sale-row-${sale.id}`}>
                          <TableCell className="font-mono text-sm">
                            {sale.sale_number}
                          </TableCell>
                          <TableCell>
                            {format(new Date(sale.created_at), "PPp", { locale: es })}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                              {sale.status === "completed" ? "Completada" : sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewSaleDetails(sale)}
                              data-testid={`view-sale-${sale.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showSaleDetails} onOpenChange={setShowSaleDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta {selectedSale?.sale_number}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), "PPp", { locale: es })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <p>
                    <Badge variant={selectedSale.status === "completed" ? "default" : "secondary"}>
                      {selectedSale.status === "completed" ? "Completada" : selectedSale.status}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Productos</h4>
                <div className="border rounded-lg divide-y">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.final_price)} x {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA (informativo):</span>
                  <span>{formatCurrency(selectedSale.tax_total)}</span>
                </div>
                {selectedSale.discount_total > 0 && (
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Descuentos:</span>
                    <span>-{formatCurrency(selectedSale.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {selectedSale.payments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Pagos</h4>
                  <div className="space-y-1">
                    {selectedSale.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                        <span className="capitalize">{payment.payment_method}</span>
                        <span className="font-mono">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSale.notes && (
                <div>
                  <h4 className="font-medium mb-1">Notas</h4>
                  <p className="text-sm text-muted-foreground">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaleDetails(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total a pagar:</span>
                <span>${total.toLocaleString()}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-500">
                    <span>Pagado:</span>
                    <span>${totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Restante:</span>
                    <span>${remaining.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Métodos de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      const amount = remaining || total;
                      addPayment(method.id, amount);
                    }}
                    disabled={remaining === 0}
                    data-testid={`button-payment-${method.id}`}
                  >
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            {payments.length > 0 && (
              <div className="space-y-2">
                <Label>Pagos Agregados</Label>
                {payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                    data-testid={`payment-${index}`}
                  >
                    <span className="capitalize">{payment.method}</span>
                    <div className="flex items-center gap-2">
                      <span>${payment.amount.toLocaleString()}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removePayment(index)}
                        data-testid={`button-remove-payment-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Descuento Global (opcional)</Label>
              <Input
                type="number"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                placeholder="0"
                data-testid="input-global-discount"
              />
              {globalDiscount > 0 && (
                <Input
                  value={globalDiscountReason}
                  onChange={(e) => setGlobalDiscountReason(e.target.value)}
                  placeholder="Motivo del descuento"
                  data-testid="input-discount-reason"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={processSale}
              disabled={isProcessing || totalPaid < total}
              data-testid="button-confirm-sale"
            >
              {isProcessing ? "Procesando..." : "Confirmar Venta"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar Descuento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Porcentaje de descuento</Label>
              <Input
                type="number"
                value={itemDiscount.percent}
                onChange={(e) =>
                  setItemDiscount({ ...itemDiscount, percent: Number(e.target.value), amount: 0 })
                }
                placeholder="0"
                max={100}
                data-testid="input-item-discount-percent"
              />
            </div>
            <div className="text-center text-muted-foreground">o</div>
            <div className="space-y-2">
              <Label>Monto de descuento</Label>
              <Input
                type="number"
                value={itemDiscount.amount}
                onChange={(e) =>
                  setItemDiscount({ ...itemDiscount, amount: Number(e.target.value), percent: 0 })
                }
                placeholder="0"
                data-testid="input-item-discount-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo del descuento</Label>
              <Input
                value={itemDiscount.reason}
                onChange={(e) => setItemDiscount({ ...itemDiscount, reason: e.target.value })}
                placeholder="Motivo..."
                data-testid="input-item-discount-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={applyItemDiscount} data-testid="button-apply-discount">
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
