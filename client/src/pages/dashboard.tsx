import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Download, FileCode } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { transactions, accounts } = useStore();

  const totalIncome = transactions
    .filter(t => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense + accounts.reduce((acc, a) => acc + a.initialBalance, 0);
  // Note: real balance calculation might be simpler just summing currentBalance of all accounts
  const realTotalBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Chart Data
  const incomeByAccount = accounts.map(acc => {
    const income = transactions
      .filter(t => t.type === 'ingreso' && t.accountId === acc.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: acc.name, value: income };
  }).filter(d => d.value > 0);

  const expenseByCategory = transactions
    .filter(t => t.type === 'egreso')
    .reduce((acc, t) => {
      // Grouping simply by description for now as we don't have categories in the spec
      // Better: Group by Payment Method as per spec requirements for charts
      const key = t.method; 
      acc[key] = (acc[key] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
  const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance General</h1>
          <p className="text-muted-foreground mt-1">Resumen de tu actividad financiera</p>
        </div>
        
        <a href="/finanzas_pro_source.zip" download>
          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <FileCode className="h-4 w-4" />
            Descargar Código Python (.zip)
          </Button>
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-sidebar-primary to-blue-600 text-white border-none shadow-lg shadow-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Balance Total
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(realTotalBalance)}</div>
            <p className="text-xs text-blue-200 mt-1">
              En todas las cuentas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Totales
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">+{formatCurrency(totalIncome)}</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> Movimientos registrados
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Egresos Totales
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">-{formatCurrency(totalExpense)}</div>
            <div className="flex items-center text-xs text-rose-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" /> Movimientos registrados
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribución de Saldos</CardTitle>
            <CardDescription>Balance actual por cuenta</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accounts}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value / 1000}k`} 
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="currentBalance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Saldo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Egresos por Método</CardTitle>
            <CardDescription>Cómo estás gastando tu dinero</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {expenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No hay datos de egresos aún</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
