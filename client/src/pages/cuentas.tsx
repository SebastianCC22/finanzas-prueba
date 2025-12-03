import { useStore, ACCOUNT_CATEGORIES, AccountCategory } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Pencil, ChevronDown, Banknote, Smartphone, CreditCard, DollarSign } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const accountSchema = z.object({
  initialBalance: z.coerce.number().min(0, "El saldo debe ser positivo"),
});

const categoryIcons: Record<AccountCategory, React.ReactNode> = {
  cajas: <Banknote className="h-5 w-5" />,
  nequi: <Smartphone className="h-5 w-5" />,
  bold: <CreditCard className="h-5 w-5" />,
  daviplata: <DollarSign className="h-5 w-5" />,
};

const categoryColors: Record<AccountCategory, string> = {
  cajas: 'from-green-500 to-emerald-600',
  nequi: 'from-purple-500 to-violet-600',
  bold: 'from-orange-500 to-amber-600',
  daviplata: 'from-red-500 to-rose-600',
};

const categoryBgColors: Record<AccountCategory, string> = {
  cajas: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  nequi: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  bold: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  daviplata: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
};

export default function Cuentas() {
  const { getAccountsByCategory, updateAccountBalance } = useStore();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    cajas: true,
    nequi: false,
    bold: false,
    daviplata: false,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      initialBalance: 0,
    },
  });

  function onSubmit(values: z.infer<typeof accountSchema>) {
    if (editingAccount) {
      updateAccountBalance(editingAccount.id, values.initialBalance);
    }
    setIsDialogOpen(false);
    setEditingAccount(null);
    form.reset();
  }

  const handleEdit = (account: { id: string; name: string; initialBalance: number }) => {
    setEditingAccount({ id: account.id, name: account.name });
    form.reset({
      initialBalance: account.initialBalance,
    });
    setIsDialogOpen(true);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getTotalByCategory = (category: AccountCategory) => {
    const accounts = getAccountsByCategory(category);
    return accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Cuentas</h1>
        <p className="text-muted-foreground mt-1">Administra tus cajas por categoría</p>
      </div>

      <div className="space-y-4">
        {ACCOUNT_CATEGORIES.map((cat) => {
          const accounts = getAccountsByCategory(cat.id);
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      {accounts.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900/50 border shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{account.tier === 'mayor' ? 'Caja Mayor' : 'Caja Menor'}</p>
                              <p className="text-xs text-muted-foreground">
                                Base: {formatCurrency(account.initialBalance)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-mono font-bold text-lg">{formatCurrency(account.currentBalance)}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(account);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {editingAccount?.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Base</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} className="font-mono" />
                    </FormControl>
                    <FormDescription>
                      El ajuste del saldo base recalculará el saldo actual.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Guardar Cambios</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
