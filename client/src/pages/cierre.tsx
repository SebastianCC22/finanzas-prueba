import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashOpening, CashClosing, CashRegister } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator, History, Wallet, ArrowUpCircle, ArrowDownCircle,
  AlertCircle, Download, Check, X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Cierre() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();

  const [todayOpening, setTodayOpening] = useState<CashOpening | null>(null);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [actualBalance, setActualBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [openingData, closingsData, registersData] = await Promise.all([
        api.getTodayOpening(currentStore.id),
        api.getCashClosings({ storeId: currentStore.id }),
        api.getCashRegisters(currentStore.id, true),
      ]);
      setTodayOpening(openingData);
      setClosings(closingsData);
      setCashRegisters(registersData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClosing = async () => {
    if (!currentStore || !todayOpening) return;

    setIsSubmitting(true);
    try {
      await api.createCashClosing({
        opening_id: todayOpening.id,
        store_id: currentStore.id,
        actual_balance: parseFloat(actualBalance) || 0,
        notes: notes || undefined,
      });

      toast({
        title: "Cierre registrado",
        description: "El cierre de caja se ha registrado correctamente",
      });

      setShowClosingDialog(false);
      setActualBalance("");
      setNotes("");
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalBalance = cashRegisters
    .filter((r) => r.store_id === currentStore?.id)
    .reduce((sum, r) => sum + r.current_balance, 0);

  const todayClosing = closings.find((c) => c.opening_id === todayOpening?.id);

  const downloadReport = (closingId: number) => {
    const url = api.getClosingReportUrl(closingId);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Cierre de Caja
        </h1>
        <p className="text-muted-foreground mt-1">
          Balance de cajas y cierre del día - {currentStore?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Balance Total de Cajas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-total-balance">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-indigo-200 mt-1">Suma de todas las cajas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
              Estado de Apertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayOpening ? (
              <div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  <Check className="h-3 w-3 mr-1" />
                  Abierta
                </Badge>
                <p className="text-sm mt-2">
                  Base: {formatCurrency(todayOpening.initial_balance)}
                </p>
              </div>
            ) : (
              <Badge variant="destructive">
                <X className="h-3 w-3 mr-1" />
                Sin apertura hoy
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" />
              Estado de Cierre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayClosing ? (
              <div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <Check className="h-3 w-3 mr-1" />
                  Cerrada
                </Badge>
                <p className="text-sm mt-2">
                  Balance: {formatCurrency(todayClosing.actual_balance)}
                </p>
              </div>
            ) : todayOpening ? (
              <Button
                onClick={() => setShowClosingDialog(true)}
                className="w-full"
                data-testid="button-close-cash"
              >
                Realizar Cierre
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Primero debe realizar la apertura
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo de Cajas</CardTitle>
          <CardDescription>Estado actual de cada caja</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cashRegisters
              .filter((r) => r.store_id === currentStore?.id || r.is_global)
              .map((register) => (
                <div
                  key={register.id}
                  className="p-4 border rounded-lg bg-muted/20"
                  data-testid={`register-${register.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    {register.is_global && (
                      <Badge variant="outline" className="text-xs">
                        Global
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm">{register.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mb-2">
                    {register.payment_method} - {register.register_type}
                  </p>
                  <p
                    className={cn(
                      "font-mono font-bold text-lg",
                      register.current_balance < 0 && "text-destructive"
                    )}
                  >
                    {formatCurrency(register.current_balance)}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cierres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {closings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cierres registrados
              </div>
            ) : (
              closings.slice(0, 10).map((closing) => (
                <div
                  key={closing.id}
                  className="p-4 border rounded-lg"
                  data-testid={`closing-${closing.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">
                      {format(new Date(closing.closing_date), "PPP", { locale: es })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadReport(closing.id)}
                      data-testid={`button-download-${closing.id}`}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Ventas</span>
                      <span className="font-mono text-emerald-600">
                        +{formatCurrency(closing.total_sales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Egresos</span>
                      <span className="font-mono text-rose-600">
                        -{formatCurrency(closing.total_expenses)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Esperado</span>
                      <span className="font-mono">
                        {formatCurrency(closing.expected_balance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Real</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(closing.actual_balance)}
                      </span>
                    </div>
                  </div>
                  {closing.difference !== 0 && (
                    <div
                      className={cn(
                        "mt-2 p-2 rounded text-sm",
                        closing.difference > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      )}
                    >
                      Diferencia: {formatCurrency(closing.difference)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showClosingDialog} onOpenChange={setShowClosingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cierre de Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Base de apertura</p>
              <p className="font-mono font-bold text-lg">
                {formatCurrency(todayOpening?.initial_balance || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualBalance">Balance Real (conteo físico)</Label>
              <Input
                id="actualBalance"
                type="number"
                placeholder="0"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                className="font-mono text-lg"
                data-testid="input-actual-balance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones del cierre..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosingDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleClosing}
              disabled={isSubmitting || !actualBalance}
              data-testid="button-confirm-closing"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
