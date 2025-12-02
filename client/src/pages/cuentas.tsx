import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, CreditCard } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const accountSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  initialBalance: z.coerce.number().min(0, "El saldo debe ser positivo"),
});

export default function Cuentas() {
  const { accounts, addAccount } = useStore();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      initialBalance: 0,
    },
  });

  function onSubmit(values: z.infer<typeof accountSchema>) {
    addAccount(values.name, values.initialBalance);
    setOpen(false);
    form.reset();
  }

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
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Cuenta</DialogTitle>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Crear Cuenta</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary group overflow-hidden relative">
            <div className="absolute right-0 top-0 h-24 w-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 group-hover:bg-primary/10 transition-colors" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-lg font-medium">
                {account.name}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold font-mono tracking-tight">
                {formatCurrency(account.currentBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo disponible
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
    </div>
  );
}
