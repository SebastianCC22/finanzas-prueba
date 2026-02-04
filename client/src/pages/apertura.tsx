import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashOpening } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LockOpen, History, Check, AlertCircle, ChevronDown, ChevronUp, Store } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Apertura() {
  const { currentStore, user } = useAuthStore();
  const { toast } = useToast();
  
  const [openings, setOpenings] = useState<CashOpening[]>([]);
  const [todayOpening, setTodayOpening] = useState<CashOpening | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [openingsData, todayData] = await Promise.all([
        api.getCashOpenings({ storeId: currentStore.id }),
        api.getTodayOpening(currentStore.id),
      ]);
      setOpenings(openingsData);
      setTodayOpening(todayData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

        {todayOpening && (
          <div className={`rounded-xl p-4 mb-6 ${!isAdmin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!isAdmin ? 'bg-emerald-500/30' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  <Check className={`h-5 w-5 ${!isAdmin ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!isAdmin ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    Apertura realizada hoy
                  </p>
                  <p className={`text-sm ${!isAdmin ? 'text-emerald-400/80' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {format(new Date(todayOpening.opening_date), "PPP 'a las' p", { locale: es })}
                    {" - "}
                    Base: {formatCurrency(todayOpening.initial_balance)}
                  </p>
                </div>
              </div>
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
              
              {todayOpening && !isEditing ? (
                <div className={`flex items-center gap-3 p-4 rounded-lg ${!isAdmin ? 'bg-slate-800/50' : 'bg-muted'}`}>
                  <AlertCircle className={`h-5 w-5 ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`} />
                  <p className={`text-sm ${!isAdmin ? 'text-slate-400' : 'text-muted-foreground'}`}>
                    Ya se realizó la apertura de caja hoy.{isAdmin ? " Usa el botón Editar para hacer cambios." : ""}
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
    </div>
  );
}
