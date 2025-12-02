import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, ShoppingBag } from "lucide-react";

export default function Login() {
  const login = useStore((state) => state.login);
  const [, setLocation] = useLocation();

  const handleLogin = (storeName: string) => {
    login(storeName);
    // Use a timeout to allow state to update before navigation
    // This helps prevent hook mismatch errors if re-renders happen
    setTimeout(() => setLocation("/"), 0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-200/60 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/30 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      
      <Card className="w-full max-w-2xl relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        <CardHeader className="text-center space-y-4 pb-8 border-b">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight mb-2">Finanzas Rincon Integral</CardTitle>
            <CardDescription className="text-lg">Seleccione la tienda para operar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => handleLogin("20 de Julio")}
              className="group relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-muted hover:border-primary/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">20 de Julio</h3>
              <p className="text-sm text-muted-foreground mt-2">Ingresar al panel</p>
            </button>

            <button
              onClick={() => handleLogin("Tunal")}
              className="group relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-muted hover:border-primary/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Tunal</h3>
              <p className="text-sm text-muted-foreground mt-2">Ingresar al panel</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
