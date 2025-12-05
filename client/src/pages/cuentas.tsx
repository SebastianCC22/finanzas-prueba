import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashRegister } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ChevronDown, Banknote, Smartphone, CreditCard, DollarSign } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type PaymentCategory = "efectivo" | "nequi" | "bold" | "daviplata";

const PAYMENT_CATEGORIES: { id: PaymentCategory; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "nequi", label: "Nequi" },
  { id: "bold", label: "Bold" },
  { id: "daviplata", label: "Daviplata" },
];

const categoryIcons: Record<PaymentCategory, React.ReactNode> = {
  efectivo: <Banknote className="h-5 w-5" />,
  nequi: <Smartphone className="h-5 w-5" />,
  bold: <CreditCard className="h-5 w-5" />,
  daviplata: <DollarSign className="h-5 w-5" />,
};

const categoryColors: Record<PaymentCategory, string> = {
  efectivo: 'from-green-500 to-emerald-600',
  nequi: 'from-purple-500 to-violet-600',
  bold: 'from-orange-500 to-amber-600',
  daviplata: 'from-red-500 to-rose-600',
};

const categoryBgColors: Record<PaymentCategory, string> = {
  efectivo: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  nequi: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  bold: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  daviplata: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
};

export default function Cuentas() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();
  
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    efectivo: true,
    nequi: false,
    bold: false,
    daviplata: false,
  });

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const data = await api.getCashRegisters(currentStore.id, true);
      setCashRegisters(data);
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

  const getRegistersByPaymentMethod = (method: PaymentCategory) => {
    return cashRegisters.filter((r) => r.payment_method === method);
  };

  const getTotalByCategory = (method: PaymentCategory) => {
    const registers = getRegistersByPaymentMethod(method);
    return registers.reduce((sum, r) => sum + r.current_balance, 0);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

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
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Cajas Registradoras</h1>
        <p className="text-muted-foreground mt-1">Saldos actuales por método de pago - {currentStore?.name}</p>
      </div>

      <div className="space-y-4">
        {PAYMENT_CATEGORIES.map((cat) => {
          const registers = getRegistersByPaymentMethod(cat.id);
          const total = getTotalByCategory(cat.id);
          const isOpen = openCategories[cat.id];

          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => toggleCategory(cat.id)}>
              <Card className={cn("overflow-hidden transition-all", categoryBgColors[cat.id])}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br", categoryColors[cat.id])}>
                          {categoryIcons[cat.id]}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cat.label}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Total: <span className="font-mono font-medium">{formatCurrency(total)}</span>
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {registers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No hay cajas registradas</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {registers.map((register) => (
                          <div
                            key={register.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900/50 border shadow-sm"
                            data-testid={`register-${register.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{register.name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {register.register_type === "mayor" ? "Mayor" : "Menor"}
                                  </Badge>
                                  {register.is_global && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Global
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-lg">{formatCurrency(register.current_balance)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
