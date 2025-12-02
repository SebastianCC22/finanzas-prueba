import { useStore, PaymentMethod } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calculator, CheckCircle2, Banknote, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Cierre() {
  const { getStoreTransactions, getStoreAccounts } = useStore();
  const transactions = getStoreTransactions();
  const accounts = getStoreAccounts();

  // Calculate totals by Method
  const methods: PaymentMethod[] = ['Efectivo', 'Nequi', 'Daviplata', 'Bolt'];
  
  // Get accounts by payment method
  const accountsByMethod: { [key in PaymentMethod]?: number } = {
    'Efectivo': accounts.find(a => a.name.toLowerCase().includes('efectivo'))?.initialBalance || 0,
    'Nequi': accounts.find(a => a.name.toLowerCase().includes('nequi'))?.initialBalance || 0,
    'Daviplata': accounts.find(a => a.name.toLowerCase().includes('daviplata'))?.initialBalance || 0,
    'Bolt': accounts.find(a => a.name.toLowerCase().includes('bolt'))?.initialBalance || 0,
  };
  
  const statsByMethod = methods.map(method => {
    const transactionIncome = transactions
      .filter(t => t.type === 'ingreso' && t.method === method)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const accountBalance = accountsByMethod[method] || 0;
    const income = transactionIncome + accountBalance;
      
    const expense = transactions
      .filter(t => t.type === 'egreso' && t.method === method)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      method,
      income,
      expense,
      balance: income - expense
    };
  });

  const totalIncome = statsByMethod.reduce((acc, curr) => acc + curr.income, 0);
  const totalExpense = statsByMethod.reduce((acc, curr) => acc + curr.expense, 0);
  const totalBalance = totalIncome - totalExpense;

  // Calculate Caja Mayor stats
  const cajaMayorAccount = accounts.find(a => a.name === "Caja Mayor");
  const cajaMayorBase = cajaMayorAccount?.initialBalance || 0;
  const cajaMayorIngresos = cajaMayorAccount 
    ? transactions.filter(t => t.type === 'ingreso' && t.accountId === cajaMayorAccount.id).reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const cajaMayorEgresos = cajaMayorAccount 
    ? transactions.filter(t => t.type === 'egreso' && t.accountId === cajaMayorAccount.id).reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const cajaMayorSaldo = cajaMayorBase + cajaMayorIngresos - cajaMayorEgresos;

  // Calculate Caja Menor stats
  const cajaMenorAccount = accounts.find(a => a.name === "Caja Menor");
  const cajaMenorBase = cajaMenorAccount?.initialBalance || 0;
  const cajaMenorIngresos = cajaMenorAccount 
    ? transactions.filter(t => t.type === 'ingreso' && t.accountId === cajaMenorAccount.id).reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const cajaMenorEgresos = cajaMenorAccount 
    ? transactions.filter(t => t.type === 'egreso' && t.accountId === cajaMenorAccount.id).reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const cajaMenorSaldo = cajaMenorBase + cajaMenorIngresos - cajaMenorEgresos;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cierre de Caja</h1>
        <p className="text-muted-foreground mt-1">Balance de ventas menos gastos por tipo de pago</p>
      </div>

      {/* Grand Totals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-100 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Balance Neto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-indigo-200 mt-1">Ingresos + Cuentas - Egresos</p>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Total Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Caja Mayor y Caja Menor */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo de Cajas</CardTitle>
          <CardDescription>Estado actual de Caja Mayor y Caja Menor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Caja Mayor */}
            <div className="border rounded-xl p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-blue-500 opacity-10 pointer-events-none" />
              
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Banknote className="h-5 w-5" />
                Caja Mayor
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Inicial</span>
                  <span className="font-mono font-medium">{formatCurrency(cajaMayorBase)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ingresos Guardados</span>
                  <span className="font-mono text-emerald-600 font-medium">+{formatCurrency(cajaMayorIngresos)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Egresos Realizados</span>
                  <span className="font-mono text-rose-600 font-medium">-{formatCurrency(cajaMayorEgresos)}</span>
                </div>
                <div className="pt-3 border-t border-blue-200 dark:border-blue-800 mt-2 flex justify-between items-center font-bold">
                  <span>Saldo Final</span>
                  <span className={cn("font-mono text-xl", cajaMayorSaldo >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-600")}>
                    {formatCurrency(cajaMayorSaldo)}
                  </span>
                </div>
              </div>
            </div>

            {/* Caja Menor */}
            <div className="border rounded-xl p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-amber-500 opacity-10 pointer-events-none" />
              
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <PiggyBank className="h-5 w-5" />
                Caja Menor
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Inicial</span>
                  <span className="font-mono font-medium">{formatCurrency(cajaMenorBase)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ingresos Guardados</span>
                  <span className="font-mono text-emerald-600 font-medium">+{formatCurrency(cajaMenorIngresos)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Egresos Realizados</span>
                  <span className="font-mono text-rose-600 font-medium">-{formatCurrency(cajaMenorEgresos)}</span>
                </div>
                <div className="pt-3 border-t border-amber-200 dark:border-amber-800 mt-2 flex justify-between items-center font-bold">
                  <span>Saldo Final</span>
                  <span className={cn("font-mono text-xl", cajaMenorSaldo >= 0 ? "text-amber-700 dark:text-amber-400" : "text-rose-600")}>
                    {formatCurrency(cajaMenorSaldo)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Método de Pago</CardTitle>
          <CardDescription>Detalle de movimientos y saldo final por canal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsByMethod.map((stat) => (
              <div key={stat.method} className="border rounded-xl p-4 bg-card hover:bg-accent/5 transition-colors relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-5 pointer-events-none",
                  stat.method === 'Efectivo' ? 'bg-green-500' : 
                  stat.method === 'Nequi' ? 'bg-purple-500' : 
                  stat.method === 'Daviplata' ? 'bg-red-500' : 'bg-orange-500'
                )} />
                
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {stat.method === 'Efectivo' && <Wallet className="h-4 w-4 text-green-600" />}
                  {stat.method === 'Nequi' && <Wallet className="h-4 w-4 text-purple-600" />}
                  {stat.method === 'Daviplata' && <Wallet className="h-4 w-4 text-red-600" />}
                  {stat.method === 'Bolt' && <Wallet className="h-4 w-4 text-orange-600" />}
                  {stat.method}
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ingresos</span>
                    <span className="font-mono text-emerald-600 font-medium">+{formatCurrency(stat.income)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Egresos</span>
                    <span className="font-mono text-rose-600 font-medium">-{formatCurrency(stat.expense)}</span>
                  </div>
                  <div className="pt-3 border-t mt-2 flex justify-between items-center font-bold">
                    <span>Balance</span>
                    <span className={cn("font-mono text-lg", stat.balance >= 0 ? "text-foreground" : "text-rose-600")}>
                      {formatCurrency(stat.balance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
