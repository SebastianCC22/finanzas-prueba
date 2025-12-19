import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { api, Store } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store as StoreIcon, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SelectStore() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setCurrentStore, user } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await api.getStores();
      setStores(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las tiendas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStore = (store: Store) => {
    setCurrentStore(store);
    toast({
      title: "Tienda seleccionada",
      description: `Ahora estás trabajando en ${store.name}`,
    });
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-200/60 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/30" />
      
      <Card className="w-full max-w-lg relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        <CardHeader className="text-center space-y-4 pb-6 border-b">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
            <StoreIcon className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight mb-2">
              Selecciona tu Tienda
            </CardTitle>
            <CardDescription className="text-base">
              Hola {user?.full_name || user?.username}, ¿en cuál tienda vas a trabajar hoy?
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <div className="grid gap-4">
            {stores.map((store) => (
              <Button
                key={store.id}
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all"
                onClick={() => handleSelectStore(store)}
                data-testid={`button-store-${store.id}`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span className="text-xl font-semibold">{store.name}</span>
                </div>
                {store.address && (
                  <span className="text-sm opacity-70">{store.address}</span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
