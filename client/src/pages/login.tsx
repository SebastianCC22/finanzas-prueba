import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { api, Store } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Store as StoreIcon, Lock, Shield, MapPin, ArrowLeft, Check } from "lucide-react";
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
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
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
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 overflow-hidden transition-all duration-300">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                <img 
                  src={logoImage} 
                  alt="El Rincón Integral" 
                  className="h-full w-full object-cover scale-150"
                />
              </div>
            </div>
            
            <div className="text-center mb-1">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight" data-testid="text-title">
                Finanzas Rincón Integral
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                {mode === "select" 
                  ? "Selecciona tu punto de acceso"
                  : `Ingresa tu contraseña`
                }
              </p>
            </div>
          </div>

          <div className="px-6 pb-8">
            {mode === "select" ? (
              <div className="space-y-3">
                {stores.map((store) => {
                  const isHovered = hoveredOption === `store-${store.id}`;
                  return (
                    <button
                      key={store.id}
                      type="button"
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                        "bg-white hover:bg-slate-50/80",
                        isHovered 
                          ? "border-blue-400 shadow-md shadow-blue-100/50" 
                          : "border-slate-200 hover:border-slate-300"
                      )}
                      onClick={() => handleSelectStore(store)}
                      onMouseEnter={() => setHoveredOption(`store-${store.id}`)}
                      onMouseLeave={() => setHoveredOption(null)}
                      data-testid={`button-store-${store.id}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200",
                          isHovered 
                            ? "bg-blue-500 text-white" 
                            : "bg-slate-100 text-slate-500"
                        )}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-[15px]">
                            {store.name}
                          </div>
                          {store.address && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate">
                              {store.address}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          isHovered 
                            ? "border-blue-500 bg-blue-500" 
                            : "border-slate-300"
                        )}>
                          {isHovered && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center px-2">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Acceso privilegiado
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                    "bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700",
                    hoveredOption === "admin"
                      ? "border-amber-400/50 shadow-lg shadow-slate-900/20"
                      : "border-transparent shadow-md shadow-slate-900/10"
                  )}
                  onClick={handleSelectAdmin}
                  onMouseEnter={() => setHoveredOption("admin")}
                  onMouseLeave={() => setHoveredOption(null)}
                  data-testid="button-admin"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200",
                      "bg-amber-500/20 text-amber-400"
                    )}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-[15px]">
                        Administrador
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Acceso completo al sistema
                      </div>
                    </div>
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                      hoveredOption === "admin"
                        ? "border-amber-400 bg-amber-400"
                        : "border-slate-600"
                    )}>
                      {hoveredOption === "admin" && <Check className="h-3 w-3 text-slate-900" />}
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors -ml-1 mb-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver</span>
                </button>

                <div className={cn(
                  "p-4 rounded-xl flex items-center gap-3.5",
                  selectedOption?.type === "admin"
                    ? "bg-gradient-to-br from-slate-900 to-slate-800"
                    : "bg-slate-50 border border-slate-200"
                )}>
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    selectedOption?.type === "admin"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-blue-500 text-white"
                  )}>
                    {selectedOption?.type === "admin" ? (
                      <Shield className="h-5 w-5" />
                    ) : (
                      <MapPin className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-[15px]",
                      selectedOption?.type === "admin" ? "text-white" : "text-slate-900"
                    )}>
                      {selectedOption?.type === "admin" ? "Administrador" : selectedOption?.store?.name}
                    </div>
                    <div className={cn(
                      "text-xs mt-0.5",
                      selectedOption?.type === "admin" ? "text-slate-400" : "text-slate-500"
                    )}>
                      {selectedOption?.type === "admin" 
                        ? "Acceso completo" 
                        : selectedOption?.store?.address || "Punto de venta"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-blue-400/20 transition-all"
                      data-testid="input-password"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md shadow-slate-900/10 transition-all duration-200"
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
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sistema de gestión financiera v1.0
        </p>
      </div>
    </div>
  );
}
