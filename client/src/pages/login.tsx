import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { api, Store } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Store as StoreIcon, Lock, Shield, MapPin, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LoginMode = "select" | "password";

interface SelectedOption {
  type: "store" | "admin";
  store?: Store;
  username: string;
}

export default function Login() {
  const [mode, setMode] = useState<LoginMode>("select");
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const setCurrentStore = useAuthStore((state) => state.setCurrentStore);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await api.getStoresPublic();
      setStores(data);
    } catch (error: any) {
      try {
        const data = await api.getStores();
        setStores(data);
      } catch {
        toast({
          title: "Error",
          description: "No se pudieron cargar las tiendas",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingStores(false);
    }
  };

  const handleSelectStore = (store: Store) => {
    const storeCode = store.code || store.name.substring(0, 3).toUpperCase();
    const username = storeCode === "TUN" ? "Cajero Tunal" : storeCode === "20J" ? "Cajero 20J" : `Cajero ${store.name}`;
    setSelectedOption({
      type: "store",
      store,
      username,
    });
    setMode("password");
  };

  const handleSelectAdmin = () => {
    setSelectedOption({
      type: "admin",
      username: "Administrador",
    });
    setMode("password");
  };

  const handleBack = () => {
    setMode("select");
    setSelectedOption(null);
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || !password) {
      toast({
        title: "Error",
        description: "Por favor ingrese la contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(selectedOption.username, password);
      
      if (selectedOption.type === "store" && selectedOption.store) {
        setCurrentStore(selectedOption.store);
        toast({
          title: "Bienvenido",
          description: `Ingresaste a ${selectedOption.store.name}`,
        });
        setTimeout(() => setLocation("/"), 0);
      } else {
        toast({
          title: "Bienvenido Administrador",
          description: "Selecciona una tienda para continuar",
        });
        setTimeout(() => setLocation("/select-store"), 0);
      }
    } catch (error: any) {
      let errorMessage = "Contraseña incorrecta";
      
      if (error.message) {
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          errorMessage = "Contraseña incorrecta";
        } else if (error.message.includes("Invalid credentials")) {
          errorMessage = "Credenciales inválidas";
        } else if (error.message.includes("not found")) {
          errorMessage = "Usuario no encontrado";
        }
      }
      
      toast({
        title: "Error de acceso",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingStores) {
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
            <CardTitle className="text-2xl font-bold tracking-tight mb-2" data-testid="text-title">
              Finanzas Rincon Integral
            </CardTitle>
            <CardDescription className="text-base">
              {mode === "select" 
                ? "Selecciona cómo deseas ingresar"
                : `Ingresa la contraseña para ${selectedOption?.type === "admin" ? "Administrador" : selectedOption?.store?.name}`
              }
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6">
          {mode === "select" ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {stores.map((store) => (
                  <Button
                    key={store.id}
                    variant="outline"
                    className="h-auto p-5 flex items-center gap-4 hover:bg-primary hover:text-primary-foreground transition-all justify-start"
                    onClick={() => handleSelectStore(store)}
                    data-testid={`button-store-${store.id}`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-semibold">{store.name}</div>
                      {store.address && (
                        <div className="text-sm opacity-70">{store.address}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                    Acceso administrativo
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-auto p-5 flex items-center gap-4 hover:bg-amber-500 hover:text-white transition-all border-amber-300 dark:border-amber-700 justify-start"
                onClick={handleSelectAdmin}
                data-testid="button-admin"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold">Administrador</div>
                  <div className="text-sm opacity-70">Acceso completo a todas las tiendas</div>
                </div>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-2 -ml-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>

              <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedOption?.type === "admin" 
                    ? "bg-amber-100 dark:bg-amber-900" 
                    : "bg-blue-100 dark:bg-blue-900"
                }`}>
                  {selectedOption?.type === "admin" ? (
                    <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">
                    {selectedOption?.type === "admin" ? "Administrador" : selectedOption?.store?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedOption?.type === "admin" 
                      ? "Acceso completo" 
                      : selectedOption?.store?.address || "Tienda"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese la contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-password"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
