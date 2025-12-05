import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, CashRegister, Expense } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, History, Download } from "lucide-react";
import { format } from "date-fns";

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "nequi", label: "Nequi" },
  { id: "bold", label: "Bold" },
  { id: "daviplata", label: "Daviplata" },
];

export default function Egresos() {
  const { currentStore } = useAuthStore();
  const { toast } = useToast();

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentStore) {
      loadData();
    }
  }, [currentStore]);

  const loadData = async () => {
    if (!currentStore) return;
    try {
      const [registersData, expensesData] = await Promise.all([
        api.getCashRegisters(currentStore.id, true),
        api.getExpenses({ storeId: currentStore.id }),
      ]);
      setCashRegisters(registersData);
      setExpenses(expensesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRegisterForMethod = (method: string) => {
    return cashRegisters.find(
      (r) => r.payment_method === method && r.register_type === "menor"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !paymentMethod || !description) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const register = getRegisterForMethod(paymentMethod);
    if (!register) {
      toast({
        title: "Error",
        description: "No se encontró la caja correspondiente",
        variant: "destructive",
      });
      return;
    }

    if (!currentStore) return;

    setIsSubmitting(true);
    try {
      await api.createExpense({
        store_id: currentStore.id,
        cash_register_id: register.id,
        payment_method: paymentMethod,
        amount: parseFloat(amount),
        description,
      });

      toast({
        title: "Egreso registrado",
        description: "El egreso se ha registrado correctamente",
      });

      setAmount("");
      setPaymentMethod("");
      setDescription("");
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

  const exportExpenses = () => {
    if (!currentStore) return;
    const url = api.getExportUrl("expenses", "excel", { store_id: currentStore.id.toString() });
    window.open(url, "_blank");
  };

  const totalExpensesToday = expenses
    .filter((e) => format(new Date(e.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Egresos - {currentStore?.name}
        </h1>
        <Button variant="outline" onClick={exportExpenses} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Registrar Egreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                    data-testid="input-amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Motivo del egreso..."
                  data-testid="input-description"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Registrando..." : "Registrar Egreso"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Egresos
            </CardTitle>
            <Badge variant="destructive" className="text-lg">
              Hoy: ${totalExpensesToday.toLocaleString()}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                      <TableCell>
                        {format(new Date(expense.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {expense.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -${expense.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
