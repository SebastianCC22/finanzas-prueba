import { useStore, PaymentMethod, ACCOUNT_CATEGORIES, AccountCategory } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calculator, Banknote, Smartphone, CreditCard, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons: Record<AccountCategory, React.ReactNode> = {
  cajas: <Banknote className="h-5 w-5" />,
  nequi: <Smartphone className="h-5 w-5" />,
  bold: <CreditCard className="h-5 w-5" />,
  daviplata: <DollarSign className="h-5 w-5" />,
};

const categoryColors: Record<AccountCategory, { bg: string; text: string; border: string }> = {
  cajas: { bg: 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  nequi: { bg: 'from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  bold: { bg: 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  daviplata: { bg: 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
};

export default function Cierre() {
  const { getStoreTransactions, getStoreAccounts, getAccountsByCategory } = useStore();
  const transactions = getStoreTransactions();
  const accounts = getStoreAccounts();

  const methods: PaymentMethod[] = ['Efectivo', 'Nequi', 'Daviplata', 'Bolt'];
  
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

  const calculateCategoryStats = (category: AccountCategory) => {
    const categoryAccounts = getAccountsByCategory(category);
    
    return categoryAccounts.map(account => {
      const base = account.initialBalance;
      const ingresos = transactions
        .filter(t => t.type === 'ingreso' && t.accountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const egresos = transactions
        .filter(t => t.type === 'egreso' && t.accountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const saldo = base + ingresos - egresos;
      
      return {
        ...account,
        base,
        ingresos,
        egresos,
        saldo,
      };
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const grandTotal = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cierre de Caja</h1>
        <p className="text-muted-foreground mt-1">Balance completo de todas las cajas y métodos de pago</p>
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
            <div className="text-3xl font-bold font-mono">{formatCurrency(grandTotal)}</div>
            <p className="text-xs text-indigo-200 mt-1">Suma de todas las cajas</p>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo de Todas las Cajas</CardTitle>
          <CardDescription>Estado actual de cada caja por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {ACCOUNT_CATEGORIES.map((cat) => {
              const stats = calculateCategoryStats(cat.id);
              const colors = categoryColors[cat.id];
              const categoryTotal = stats.reduce((sum, s) => sum + s.saldo, 0);
              
              return (
                <div key={cat.id} className={cn("border rounded-xl p-5 bg-gradient-to-br relative overflow-hidden", colors.bg, colors.border)}>
                  <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-current opacity-5 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={cn("font-bold text-xl flex items-center gap-2", colors.text)}>
                      {categoryIcons[cat.id]}
                      {cat.label}
                    </h3>
                    <span className={cn("font-mono font-bold text-lg", colors.text)}>
                      {formatCurrency(categoryTotal)}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {stats.map((account) => (
                      <div key={account.id} className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            {account.tier === 'mayor' ? 'Caja Mayor' : 'Caja Menor'}
                          </span>
                          <span className={cn("font-mono font-bold", account.saldo >= 0 ? "" : "text-rose-600")}>
                            {formatCurrency(account.saldo)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Base</span>
                            <span className="font-mono">{formatCurrency(account.base)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Ingresos</span>
                            <span className="font-mono text-emerald-600">+{formatCurrency(account.ingresos)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Egresos</span>
                            <span className="font-mono text-rose-600">-{formatCurrency(account.egresos)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
