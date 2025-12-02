import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LockOpen, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const openingSchema = z.object({
  cajaMayor: z.coerce.number().min(0, "El valor debe ser positivo"),
  cajaMenor: z.coerce.number().min(0, "El valor debe ser positivo"),
});

export default function Apertura() {
  const { addOpening, getStoreOpenings, currentStore } = useStore();
  const openings = getStoreOpenings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof openingSchema>>({
    resolver: zodResolver(openingSchema),
    defaultValues: {
      cajaMayor: 0,
      cajaMenor: 0,
    },
  });

  function onSubmit(values: z.infer<typeof openingSchema>) {
    addOpening(values.cajaMayor, values.cajaMenor);
    toast({
      title: "Apertura Registrada",
      description: `Se han registrado los valores de apertura para ${currentStore}.`,
    });
    form.reset({ cajaMayor: 0, cajaMenor: 0 });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apertura de Caja</h1>
        <p className="text-muted-foreground mt-1">Registro informativo de valores iniciales del día</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockOpen className="h-5 w-5 text-primary" />
              Nueva Apertura
            </CardTitle>
            <CardDescription>Ingresa los valores base de las cajas</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cajaMayor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Caja Mayor</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} className="text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cajaMenor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Caja Menor</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} className="text-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full h-11 text-base">
                  Registrar Apertura
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="md:row-span-2 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {openings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay aperturas registradas en esta tienda.
                </div>
              ) : (
                openings.map((opening) => (
                  <div key={opening.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="text-xs font-medium text-muted-foreground bg-muted inline-block px-2 py-1 rounded">
                      {format(new Date(opening.date), "PPP p", { locale: es })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Caja Mayor</span>
                        <span className="font-mono font-medium">{formatCurrency(opening.cajaMayor)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Caja Menor</span>
                        <span className="font-mono font-medium">{formatCurrency(opening.cajaMenor)}</span>
                      </div>
                    </div>
                    {(opening.totalIncome !== undefined || opening.totalExpense !== undefined) && (
                      <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Día Anterior</span>
                          <span className="text-emerald-600 font-mono">+{formatCurrency(opening.totalIncome || 0)}</span>
                          <span className="text-rose-600 font-mono block">-{formatCurrency(opening.totalExpense || 0)}</span>
                        </div>
                      </div>
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
