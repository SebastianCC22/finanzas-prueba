import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { api, Store } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.png";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8faf8] to-[#f0f4f0]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-sm text-stone-500 font-medium">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#f8faf8] via-[#f5f7f5] to-[#f0f4f0] px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-12">
          <img 
            src={logoImage} 
            alt="El Rincón Integral - Tienda Naturista" 
            className="w-72 md:w-80 h-auto object-contain"
          />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-stone-200/40 border border-stone-100 p-8 md:p-10">
          {mode === "select" ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-lg font-semibold text-stone-800 tracking-tight">
                  Acceso al Sistema
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  Seleccione su punto de acceso
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-1">
                  Puntos de Venta
                </p>
                {stores.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    className="w-full p-5 rounded-xl border border-stone-200 bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-200 text-left group"
                    onClick={() => handleSelectStore(store)}
                    data-testid={`button-store-${store.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">
                          {store.name}
                        </div>
                        {store.address && (
                          <div className="text-sm text-stone-400 mt-0.5">
                            {store.address}
                          </div>
                        )}
                      </div>
                      <div className="h-3 w-3 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-1 mb-3">
                  Gestión Administrativa
                </p>
                <button
                  type="button"
                  className="w-full p-5 rounded-xl border border-stone-300 bg-stone-800 hover:bg-stone-700 transition-all duration-200 text-left group shadow-lg shadow-stone-300/30"
                  onClick={handleSelectAdmin}
                  data-testid="button-admin"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">
                        Administrador
                      </div>
                      <div className="text-sm text-stone-400 mt-0.5">
                        Acceso completo al sistema
                      </div>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors font-medium"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              <div className={cn(
                "p-5 rounded-xl",
                selectedOption?.type === "admin"
                  ? "bg-stone-800"
                  : "bg-emerald-50 border border-emerald-100"
              )}>
                <div className={cn(
                  "font-semibold",
                  selectedOption?.type === "admin" ? "text-white" : "text-emerald-800"
                )}>
                  {selectedOption?.type === "admin" ? "Administrador" : selectedOption?.store?.name}
                </div>
                <div className={cn(
                  "text-sm mt-0.5",
                  selectedOption?.type === "admin" ? "text-stone-400" : "text-emerald-600"
                )}>
                  {selectedOption?.type === "admin" 
                    ? "Acceso completo al sistema" 
                    : selectedOption?.store?.address || "Punto de venta"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-stone-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-stone-50 border-stone-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-base"
                    data-testid="input-password"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-12 font-semibold text-base shadow-lg transition-all duration-200",
                  selectedOption?.type === "admin"
                    ? "bg-stone-800 hover:bg-stone-700 shadow-stone-300/30"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50"
                )}
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-8 font-medium">
          Sistema de Gestión Financiera
        </p>
      </div>
    </div>
  );
}
