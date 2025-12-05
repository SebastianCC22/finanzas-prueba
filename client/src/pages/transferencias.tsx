import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashRegister, CashTransfer } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeftRight, History, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Transferencias() {
  const { currentStore, stores } = useAuthStore();
  const { toast } = useToast();

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [transfers, setTransfers] = useState<CashTransfer[]>([]);
  const [fromRegisterId, setFromRegisterId] = useState("");
  const [toRegisterId, setToRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [registersData, transfersData] = await Promise.all([
        api.getCashRegisters(currentStore.id, true),
        api.getCashTransfers({ storeId: currentStore.id }),
      ]);
      setCashRegisters(registersData);
      setTransfers(transfersData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedFromRegister = cashRegisters.find((r) => r.id.toString() === fromRegisterId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromRegisterId || !toRegisterId || !amount) {
      toast({
        title: "Error",
        description: "Seleccione origen, destino y monto",
        variant: "destructive",
      });
      return;
    }

    if (fromRegisterId === toRegisterId) {
      toast({
        title: "Error",
        description: "Origen y destino deben ser diferentes",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createCashTransfer({
        from_register_id: parseInt(fromRegisterId),
        to_register_id: parseInt(toRegisterId),
        amount: parseFloat(amount),
        reason,
      });

      toast({
        title: "Transferencia exitosa",
        description: "Los fondos se han transferido correctamente",
      });

      setFromRegisterId("");
      setToRegisterId("");
      setAmount("");
      setReason("");
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

  const getRegisterName = (registerId: number) => {
    const register = cashRegisters.find((r) => r.id === registerId);
    return register?.name || "Desconocido";
  };

  const groupedRegisters = [
    {
      label: "Cajas Menores (Local)",
      registers: cashRegisters.filter((r) => r.register_type === "menor" && !r.is_global),
    },
    {
      label: "Cajas Mayores (Global)",
      registers: cashRegisters.filter((r) => r.register_type === "mayor" || r.is_global),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <ArrowLeftRight className="h-8 w-8 text-blue-500" />
          Transferencias entre Cajas
        </h1>
        <p className="text-muted-foreground mt-1">
          Mueve dinero entre cajas - {currentStore?.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Transferencia</CardTitle>
            <CardDescription>Transfiere fondos de una caja a otra</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Caja Origen</Label>
                <Select value={fromRegisterId} onValueChange={setFromRegisterId}>
                  <SelectTrigger data-testid="select-from">
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedRegisters.map((group) => (
                      <div key={group.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {group.label}
                        </div>
                        {group.registers.map((register) => (
                          <SelectItem key={register.id} value={register.id.toString()}>
                            <div className="flex justify-between items-center gap-4 w-full">
                              <span>{register.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatCurrency(register.current_balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFromRegister && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  Saldo disponible:{" "}
                  <span className="font-mono font-medium">
                    {formatCurrency(selectedFromRegister.current_balance)}
                  </span>
                </div>
              )}

              <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Caja Destino</Label>
                <Select value={toRegisterId} onValueChange={setToRegisterId}>
                  <SelectTrigger data-testid="select-to">
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedRegisters.map((group) => (
                      <div key={group.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {group.label}
                        </div>
                        {group.registers.map((register) => (
                          <SelectItem
                            key={register.id}
                            value={register.id.toString()}
                            disabled={register.id.toString() === fromRegisterId}
                          >
                            <div className="flex justify-between items-center gap-4 w-full">
                              <span>{register.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatCurrency(register.current_balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monto a Transferir</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-lg"
                  data-testid="input-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ej: Cuadre de caja"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="input-reason"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                <ArrowLeftRight className="h-5 w-5 mr-2" />
                {isSubmitting ? "Procesando..." : "Realizar Transferencia"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Transferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {transfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay transferencias registradas</p>
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="p-3 border rounded-lg bg-muted/30"
                    data-testid={`transfer-${transfer.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-blue-600">
                        {formatCurrency(transfer.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transfer.created_at), "d MMM yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate max-w-[120px]">
                        {getRegisterName(transfer.from_register_id)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {getRegisterName(transfer.to_register_id)}
                      </span>
                    </div>
                    {transfer.reason && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{transfer.reason}</p>
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
