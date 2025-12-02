import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Download, FileCode, Store } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { transactions, accounts, currentStore } = useStore();

  // Filter accounts included in total for balance calculation
  const activeAccounts = accounts.filter(a => a.includeInTotal);
  const activeAccountIds = activeAccounts.map(a => a.id);

  const totalIncome = transactions
    .filter(t => t.type === 'ingreso' && activeAccountIds.includes(t.accountId))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'egreso' && activeAccountIds.includes(t.accountId))
    .reduce((acc, t) => acc + t.amount, 0);

  const realTotalBalance = activeAccounts.reduce((acc, a) => acc + a.currentBalance, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Chart Data: Income by Method
  const incomeByMethod = transactions
    .filter(t => t.type === 'ingreso' && activeAccountIds.includes(t.accountId))
    .reduce((acc, t) => {
      const key = t.method; 
      acc[key] = (acc[key] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
  const incomeData = Object.entries(incomeByMethod).map(([name, value]) => ({ name, value }));

  // Chart Data: Balance vs Income vs Expense
  const balanceStats = [
    { name: 'Ingresos', value: totalIncome, color: 'hsl(160 60% 45%)' },
    { name: 'Egresos', value: totalExpense, color: 'hsl(0 84.2% 60.2%)' },
    { name: 'Balance', value: realTotalBalance, color: 'hsl(221 83% 53%)' }
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Store className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">{currentStore}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Inicio</h1>
          <p className="text-muted-foreground mt-1">Resumen general de tu actividad</p>
        </div>
        
        <a href="/finanzas_pro_source.zip" download>
          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <FileCode className="h-4 w-4" />
            Descargar App Python
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
            <div className="text-3xl font-bold font-mono tracking-tight">{formatCurrency(realTotalBalance)}</div>
            <p className="text-xs text-blue-200 mt-1">
              Total en cuentas activas
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
              <TrendingUp className="h-3 w-3 mr-1" /> Recaudado
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
              <TrendingDown className="h-3 w-3 mr-1" /> Gastado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Distribución de Saldos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Distribución de Saldos</CardTitle>
            <CardDescription>Dinero en cada cuenta</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accounts} layout="vertical" margin={{left: 0}}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="currentBalance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} name="Saldo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos por Método */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ingresos por Método</CardTitle>
            <CardDescription>Entradas por canal de pago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {incomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {incomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No hay datos de ingresos</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Relación Ingreso vs Egreso vs Balance */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
            <CardDescription>Comparativa general</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceStats}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} >
                    {balanceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
