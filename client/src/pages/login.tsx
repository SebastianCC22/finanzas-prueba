import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [role, setRole] = useState("cajero");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !password) {
      toast({
        title: "Error",
        description: "Por favor seleccione un rol e ingrese la contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const username = role === "cajero" ? "Cajero" : "Administrador";
      await login(username, password);
      toast({
        title: "Bienvenido",
        description: "Inicio de sesión exitoso",
      });
      setTimeout(() => setLocation("/"), 0);
    } catch (error: any) {
      let errorMessage = "Rol o contraseña incorrectos";
      
      if (error.message) {
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          errorMessage = "Rol o contraseña incorrectos";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-200/60 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/30 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        <CardHeader className="text-center space-y-4 pb-6 border-b">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight mb-2" data-testid="text-title">
              Finanzas Rincon Integral
            </CardTitle>
            <CardDescription className="text-base">
              Sistema de gestión de tiendas naturistas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Usuario</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger id="role" data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  data-testid="input-password"
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full mt-6"
              size="lg"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
