import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Wallet, Plus, CreditCard, Pencil, Check, X, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

const accountSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  initialBalance: z.coerce.number().min(0, "El saldo debe ser positivo"),
  includeInTotal: z.boolean().default(true),
});

export default function Cuentas() {
  const { getStoreAccounts, addAccount, updateAccount, deleteAccount } = useStore();
  const accounts = getStoreAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      initialBalance: 0,
      includeInTotal: true,
    },
  });

  function onSubmit(values: z.infer<typeof accountSchema>) {
    if (editingId) {
      updateAccount(editingId, values.name, values.initialBalance, values.includeInTotal);
    } else {
      addAccount(values.name, values.initialBalance, values.includeInTotal);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  }

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    form.reset({
      name: account.name,
      initialBalance: account.initialBalance,
      includeInTotal: account.includeInTotal,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    form.reset({
      name: "",
      initialBalance: 0,
      includeInTotal: true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (accountId: string) => {
    deleteAccount(accountId);
    setDeleteConfirmId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Cuentas</h1>
          <p className="text-muted-foreground mt-1">Administra tus fuentes de dinero</p>
        </div>
        
        <Button onClick={handleAddNew} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nueva Cuenta
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary group overflow-hidden relative">
            <div className="absolute right-0 top-0 h-24 w-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 group-hover:bg-primary/10 transition-colors" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                {account.name}
                {!account.includeInTotal && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Oculta</span>
                )}
              </CardTitle>
              <div className="flex gap-1 -mr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(account)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => setDeleteConfirmId(account.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {formatCurrency(account.currentBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                <span>Saldo disponible</span>
                <span>Inicial: {formatCurrency(account.initialBalance)}</span>
              </p>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full py-12 text-center bg-muted/30 rounded-xl border border-dashed border-muted-foreground/25">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No hay cuentas registradas</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
              Crea tu primera cuenta para empezar a registrar movimientos.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cuenta' : 'Crear Nueva Cuenta'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la cuenta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Ahorros Bancolombia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Inicial</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      El ajuste del saldo inicial recalculará el saldo actual.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includeInTotal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Incluir en Balance Total</FormLabel>
                      <FormDescription>
                        Si se desactiva, esta cuenta no sumará al total general.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">{editingId ? 'Guardar Cambios' : 'Crear Cuenta'}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar esta cuenta? Esta acción también eliminará todos los movimientos asociados a esta cuenta y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
