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
import { LockOpen, History, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Apertura() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();
  
  const [openings, setOpenings] = useState<CashOpening[]>([]);
  const [todayOpening, setTodayOpening] = useState<CashOpening | null>(null);
  const [initialBalance, setInitialBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Apertura de Caja
        </h1>
        <p className="text-muted-foreground mt-1">
          Registro de valores iniciales del día - {currentStore?.name}
        </p>
      </div>

      {todayOpening && (
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Apertura realizada hoy
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {format(new Date(todayOpening.opening_date), "PPP 'a las' p", { locale: es })}
                    {" - "}
                    Base: {formatCurrency(todayOpening.initial_balance)}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setInitialBalance(todayOpening.initial_balance.toString());
                  setNotes(todayOpening.notes || "");
                }}
                data-testid="button-edit-opening"
              >
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockOpen className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Apertura" : "Nueva Apertura"}
            </CardTitle>
            <CardDescription>Ingresa los valores base de las cajas</CardDescription>
          </CardHeader>
          <CardContent>
            {todayOpening && !isEditing ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Ya se realizó la apertura de caja hoy. Usa el botón Editar para hacer cambios.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Base Inicial (Efectivo)</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    placeholder="0"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="text-lg font-mono"
                    data-testid="input-initial-balance"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="input-notes"
                  />
                </div>

                <div className="flex gap-2">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-base"
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
                    className="w-full h-11 text-base"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? (isEditing ? "Actualizando..." : "Registrando...") : (isEditing ? "Actualizar Apertura" : "Registrar Apertura")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {openings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay aperturas registradas.
                </div>
              ) : (
                openings.slice(0, 10).map((opening) => (
                  <div
                    key={opening.id}
                    className="border rounded-lg p-3 space-y-2 bg-muted/20"
                    data-testid={`opening-${opening.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {format(new Date(opening.opening_date), "PPP", { locale: es })}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(opening.opening_date), "p", { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Base Inicial</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(opening.initial_balance)}
                      </span>
                    </div>
                    {opening.notes && (
                      <p className="text-xs text-muted-foreground">{opening.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
