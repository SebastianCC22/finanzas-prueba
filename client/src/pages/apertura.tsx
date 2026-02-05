import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashOpening, CashClosing, CashClosingPreview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LockOpen, History, Check, AlertCircle, ChevronDown, ChevronUp, Store, Lock, DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Apertura() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  
  const [openings, setOpenings] = useState<CashOpening[]>([]);
  const [todayOpening, setTodayOpening] = useState<CashOpening | null>(null);
  const [todayClosing, setTodayClosing] = useState<CashClosing | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [closingActualBalance, setClosingActualBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPreview, setClosingPreview] = useState<CashClosingPreview | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const isAdmin = user?.role === "admin";
  const canOpenNew = !todayOpening || (todayOpening && todayClosing);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [openingsData, todayData, closingsData] = await Promise.all([
        api.getCashOpenings({ storeId: currentStore.id }),
        api.getTodayOpening(currentStore.id),
        api.getCashClosings({ storeId: currentStore.id }),
      ]);
      setOpenings(openingsData);
      setTodayOpening(todayData);
      
      if (todayData) {
        const closingForToday = closingsData.find(c => c.opening_id === todayData.id);
        setTodayClosing(closingForToday || null);
      } else {
        setTodayClosing(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openClosingDialog = async () => {
    if (!todayOpening || !currentStore || todayClosing) return;
    
    setIsLoadingPreview(true);
    try {
      const preview = await api.getCashClosingPreview(todayOpening.id);
      setClosingPreview(preview);
      setClosingActualBalance("");
      setClosingNotes("");
      setShowClosingDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosing = async () => {
    if (!todayOpening || !currentStore) return;
    
    setIsClosing(true);
    try {
      await api.createCashClosing({
        opening_id: todayOpening.id,
        store_id: currentStore.id,
        actual_balance: parseFloat(closingActualBalance) || 0,
        notes: closingNotes || undefined,
      });
      
      toast({
        title: "Cierre Registrado",
        description: "La caja ha sido cerrada. Puede realizar una nueva apertura.",
      });
      
      setShowClosingDialog(false);
      setClosingPreview(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
    }
  };

  const difference = closingPreview ? parseFloat(closingActualBalance || "0") - closingPreview.expected_balance : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore) return;

    setIsSubmitting(true);
    try {
      if (isEditing && todayOpening) {
        await api.updateCashOpening(todayOpening.id, {
          initial_balance: parseFloat(initialBalance) || 0,
          notes: notes || undefined,
        });

        toast({
          title: "Apertura Actualizada",
          description: `Se ha actualizado la apertura de caja`,
        });
        setIsEditing(false);
      } else {
        await api.createCashOpening({
          store_id: currentStore.id,
          initial_balance: parseFloat(initialBalance) || 0,
          notes: notes || undefined,
        });

        toast({
          title: "Apertura Registrada",
          description: `Se ha registrado la apertura de caja para ${currentStore.name}`,
        });
      }

      setInitialBalance("");
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

  const displayedOpenings = showFullHistory ? openings : openings.slice(0, 5);

  return (
    <div className={`${!isAdmin ? 'min-h-screen -m-4 md:-m-8 bg-slate-950 text-white' : ''}`}>
      <div className={`${!isAdmin ? 'p-6 md:p-8' : 'space-y-6'}`}>
        <div className="mb-6">
          {!isAdmin && (
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Store className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                {currentStore?.name}
              </span>
            </div>
          )}
          <h1 className={`text-3xl font-bold tracking-tight ${!isAdmin ? 'text-white' : ''}`} data-testid="text-page-title">
            Apertura de Caja
          </h1>
          <p className={`mt-1 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
            Registro de valores iniciales del día {isAdmin ? `- ${currentStore?.name}` : ''}
          </p>
        </div>

        {todayOpening && !todayClosing && (
          <div className={`rounded-xl p-4 mb-6 ${!isAdmin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!isAdmin ? 'bg-emerald-500/30' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  <Check className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!isAdmin ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    Caja abierta
                  </p>
                  <p className={`text-sm ${!isAdmin ? 'text-emerald-400/80' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {format(new Date(todayOpening.opening_date), "PPP 'a las' p", { locale: es })}
                    {" - "}
                    Base: {formatCurrency(todayOpening.initial_balance)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setInitialBalance(todayOpening.initial_balance.toString());
                      setNotes(todayOpening.notes || "");
                      setIsEditing(true);
                    }}
                    data-testid="button-edit-opening"
                  >
                    Editar
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={openClosingDialog}
                  className={!isAdmin ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                  data-testid="button-close-cash"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Cerrar Caja
                </Button>
              </div>
            </div>
          </div>
        )}

        {todayOpening && todayClosing && (
          <div className={`rounded-xl p-4 mb-6 ${!isAdmin ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!isAdmin ? 'bg-blue-500/30' : 'bg-blue-100 dark:bg-blue-900'}`}>
                  <Lock className={`h-5 w-5 ${!isAdmin ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!isAdmin ? 'text-blue-300' : 'text-blue-700 dark:text-blue-300'}`}>
                    Caja cerrada - Puede abrir nueva
                  </p>
                  <p className={`text-sm ${!isAdmin ? 'text-blue-400/80' : 'text-blue-600 dark:text-blue-400'}`}>
                    Cerrada: {format(new Date(todayClosing.closing_date), "p", { locale: es })}
                    {" - "}
                    Diferencia: {formatCurrency(todayClosing.difference)}
                    <span className={todayClosing.difference > 0 ? 'text-green-500' : todayClosing.difference < 0 ? 'text-red-500' : ''}>
                      {todayClosing.difference > 0 ? ' (Sobrante)' : todayClosing.difference < 0 ? ' (Faltante)' : ' (Cuadra)'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'}`}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <LockOpen className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : 'text-primary'}`} />
                <h3 className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>
                  {isEditing ? "Editar Apertura" : "Nueva Apertura"}
                </h3>
              </div>
              <p className={`text-sm mb-4 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                Ingresa los valores base de las cajas
              </p>
              
              {todayOpening && !todayClosing && !isEditing ? (
                <div className={`flex items-center gap-3 p-4 rounded-lg ${!isAdmin ? 'bg-slate-800/50' : 'bg-muted'}`}>
                  <AlertCircle className={`h-5 w-5 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`} />
                  <p className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                    Caja abierta. Cierre la caja actual para hacer una nueva apertura.{isAdmin ? " O usa el botón Editar." : ""}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance" className={!isAdmin ? 'text-slate-300' : ''}>
                      Base Inicial (Efectivo)
                    </Label>
                    <Input
                      id="initialBalance"
                      type="number"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className={`text-lg font-mono ${!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}`}
                      data-testid="input-initial-balance"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className={!isAdmin ? 'text-slate-300' : ''}>
                      Notas (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionales..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}
                      data-testid="input-notes"
                    />
                  </div>

                  <div className="flex gap-2">
                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        className={`w-full h-11 text-base ${!isAdmin ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : ''}`}
                        onClick={() => {
                          setIsEditing(false);
                          setInitialBalance("");
                          setNotes("");
                        }}
                        disabled={isSubmitting}
                        data-testid="button-cancel-edit"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className={`w-full h-11 text-base ${!isAdmin ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                      disabled={isSubmitting}
                      data-testid="button-submit"
                    >
                      {isSubmitting ? (isEditing ? "Actualizando..." : "Registrando...") : (isEditing ? "Actualizar Apertura" : "Registrar Apertura")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className={`rounded-xl ${!isAdmin ? 'bg-slate-900/50 border border-slate-800' : 'bg-card border'}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : ''}`} />
                  <h3 className={`font-semibold ${!isAdmin ? 'text-white' : ''}`}>
                    Historial de Aperturas
                  </h3>
                </div>
                {openings.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className={!isAdmin ? 'text-slate-400 hover:text-white hover:bg-slate-800' : ''}
                    data-testid="button-toggle-history"
                  >
                    {showFullHistory ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Ver todo ({openings.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className={`space-y-3 ${showFullHistory ? 'max-h-[600px]' : 'max-h-[400px]'} overflow-y-auto pr-2`}>
                {openings.length === 0 ? (
                  <div className={`text-center py-8 text-sm ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                    No hay aperturas registradas.
                  </div>
                ) : (
                  displayedOpenings.map((opening) => (
                    <div
                      key={opening.id}
                      className={`rounded-lg p-3 space-y-2 ${!isAdmin ? 'bg-slate-800/50 border border-slate-700/50' : 'border bg-muted/20'}`}
                      data-testid={`opening-${opening.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={!isAdmin ? 'border-slate-600 text-slate-300' : ''}>
                          {format(new Date(opening.opening_date), "PPP", { locale: es })}
                        </Badge>
                        <span className={`text-xs ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          {format(new Date(opening.opening_date), "p", { locale: es })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          Base Inicial
                        </span>
                        <span className={`font-mono font-medium ${!isAdmin ? 'text-white' : ''}`}>
                          {formatCurrency(opening.initial_balance)}
                        </span>
                      </div>
                      {opening.notes && (
                        <p className={`text-xs ${!isAdmin ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          {opening.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showClosingDialog} onOpenChange={setShowClosingDialog}>
        <DialogContent className={`max-w-md ${!isAdmin ? 'bg-slate-900 border-slate-700 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${!isAdmin ? 'text-white' : ''}`}>
              <Lock className="h-5 w-5" />
              Cerrar Caja
            </DialogTitle>
          </DialogHeader>
          
          {closingPreview && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg space-y-3 ${!isAdmin ? 'bg-slate-800' : 'bg-muted'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                  Base Inicial:
                </span>
                <span className={`font-mono ${!isAdmin ? 'text-white' : ''}`}>
                  {formatCurrency(closingPreview.initial_balance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm flex items-center gap-1 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Ventas (Efectivo):
                </span>
                <span className="font-mono text-green-500">
                  +{formatCurrency(closingPreview.total_cash_sales)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm flex items-center gap-1 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Gastos:
                </span>
                <span className="font-mono text-red-500">
                  -{formatCurrency(closingPreview.total_expenses)}
                </span>
              </div>
              {(closingPreview.total_transfers_in > 0 || closingPreview.total_transfers_out > 0) && (
                <>
                  {closingPreview.total_transfers_in > 0 && (
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                        Transferencias Entrada:
                      </span>
                      <span className="font-mono text-green-500">
                        +{formatCurrency(closingPreview.total_transfers_in)}
                      </span>
                    </div>
                  )}
                  {closingPreview.total_transfers_out > 0 && (
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                        Transferencias Salida:
                      </span>
                      <span className="font-mono text-red-500">
                        -{formatCurrency(closingPreview.total_transfers_out)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className={`border-t pt-3 ${!isAdmin ? 'border-slate-700' : ''}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${!isAdmin ? 'text-white' : ''}`}>
                    Efectivo Esperado:
                  </span>
                  <span className={`font-mono font-bold text-lg ${!isAdmin ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCurrency(closingPreview.expected_balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualBalance" className={!isAdmin ? 'text-slate-300' : ''}>
                Efectivo Contado
              </Label>
              <Input
                id="actualBalance"
                type="number"
                placeholder="Ingrese el efectivo contado"
                value={closingActualBalance}
                onChange={(e) => setClosingActualBalance(e.target.value)}
                className={`text-lg font-mono ${!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}`}
                data-testid="input-actual-balance"
              />
            </div>

            {closingActualBalance && (
              <div className={`p-3 rounded-lg flex items-center justify-between ${
                difference > 0 
                  ? (!isAdmin ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200')
                  : difference < 0 
                    ? (!isAdmin ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200')
                    : (!isAdmin ? 'bg-slate-800' : 'bg-muted')
              }`}>
                <span className={`flex items-center gap-2 ${!isAdmin ? 'text-slate-300' : ''}`}>
                  {difference > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : difference < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  Diferencia:
                </span>
                <span className={`font-mono font-bold ${
                  difference > 0 ? 'text-green-500' : difference < 0 ? 'text-red-500' : (!isAdmin ? 'text-white' : '')
                }`}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  <span className="text-xs ml-1">
                    {difference > 0 ? '(Sobrante)' : difference < 0 ? '(Faltante)' : '(Cuadra)'}
                  </span>
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closingNotes" className={!isAdmin ? 'text-slate-300' : ''}>
                Observaciones (opcional)
              </Label>
              <Textarea
                id="closingNotes"
                placeholder="Notas sobre el cierre..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className={!isAdmin ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : ''}
                data-testid="input-closing-notes"
              />
            </div>
          </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowClosingDialog(false)}
              className={!isAdmin ? 'border-slate-600 text-white hover:bg-slate-800' : ''}
              data-testid="button-cancel-closing"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClosing}
              disabled={isClosing || !closingActualBalance}
              className={!isAdmin ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              data-testid="button-confirm-closing"
            >
              {isClosing ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
