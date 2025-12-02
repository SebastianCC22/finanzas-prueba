import { useStore, PaymentMethod } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calculator, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Cierre() {
  const { getStoreTransactions } = useStore();
  const transactions = getStoreTransactions();

  // Calculate totals by Method
  const methods: PaymentMethod[] = ['Efectivo', 'Nequi', 'Bancolombia', 'Otro'];
  
  const statsByMethod = methods.map(method => {
    const income = transactions
      .filter(t => t.type === 'ingreso' && t.method === method)
      .reduce((sum, t) => sum + t.amount, 0);
      
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
            <p className="text-xs text-indigo-200 mt-1">Ingresos - Egresos (Global)</p>
          </CardContent>
        </Card>
        
        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Total Ventas (Ingresos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Total Gastos (Egresos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
      </div>

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
                  stat.method === 'Bancolombia' ? 'bg-yellow-500' : 'bg-gray-500'
                )} />
                
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {stat.method === 'Efectivo' && <Wallet className="h-4 w-4 text-green-600" />}
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
