import { useStore, ACCOUNT_CATEGORIES } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeftRight, History, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Seleccione cuenta origen"),
  toAccountId: z.string().min(1, "Seleccione cuenta destino"),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  note: z.string().optional(),
});

export default function Transferencias() {
  const { getStoreAccounts, getStoreTransfers, addTransfer } = useStore();
  const accounts = getStoreAccounts();
  const transfers = getStoreTransfers();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      note: "",
    },
  });

  const fromAccountId = form.watch("fromAccountId");
  const selectedFromAccount = accounts.find(a => a.id === fromAccountId);

  function onSubmit(values: z.infer<typeof transferSchema>) {
    const result = addTransfer(
      values.fromAccountId,
      values.toAccountId,
      values.amount,
      values.note || ""
    );

    if (result.success) {
      toast({
        title: "Transferencia exitosa",
        description: `Se transfirieron ${formatCurrency(values.amount)} correctamente`,
      });
      form.reset({
        fromAccountId: "",
        toAccountId: "",
        amount: 0,
        note: "",
      });
    } else {
      toast({
        title: "Error en la transferencia",
        description: result.error || "Error desconocido",
        variant: "destructive",
      });
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Cuenta desconocida';
  };

  const groupedAccounts = ACCOUNT_CATEGORIES.map(cat => ({
    ...cat,
    accounts: accounts.filter(a => a.category === cat.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="h-8 w-8 text-blue-500" />
          Transferencias
        </h1>
        <p className="text-muted-foreground mt-1">Mueve dinero entre tus cuentas</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Transferencia</CardTitle>
            <CardDescription>Transfiere fondos de una cuenta a otra</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta Origen</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cuenta origen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groupedAccounts.map(group => (
                            <div key={group.id}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                {group.label}
                              </div>
                              {group.accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  <div className="flex justify-between items-center gap-4 w-full">
                                    <span>{acc.tier === 'mayor' ? 'Caja Mayor' : 'Caja Menor'}</span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {formatCurrency(acc.currentBalance)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedFromAccount && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    Saldo disponible: <span className="font-mono font-medium">{formatCurrency(selectedFromAccount.currentBalance)}</span>
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="toAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta Destino</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cuenta destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groupedAccounts.map(group => (
                            <div key={group.id}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                {group.label}
                              </div>
                              {group.accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                                  <div className="flex justify-between items-center gap-4 w-full">
                                    <span>{acc.tier === 'mayor' ? 'Caja Mayor' : 'Caja Menor'}</span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {formatCurrency(acc.currentBalance)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto a Transferir</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} className="font-mono text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Traslado para cuadre de caja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">
                  <ArrowLeftRight className="h-5 w-5 mr-2" />
                  Realizar Transferencia
                </Button>
              </form>
            </Form>
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
                [...transfers].reverse().map((transfer) => (
                  <div key={transfer.id} className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-blue-600">
                        {formatCurrency(transfer.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transfer.date), "d MMM yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate max-w-[120px]">{getAccountName(transfer.fromAccountId)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]">{getAccountName(transfer.toAccountId)}</span>
                    </div>
                    {transfer.note && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{transfer.note}</p>
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
