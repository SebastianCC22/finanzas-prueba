import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/lib/authStore";

import Login from "@/pages/login";
import SelectStore from "@/pages/select-store";
import Dashboard from "@/pages/dashboard";
import Ventas from "@/pages/ventas";
import Devoluciones from "@/pages/devoluciones";
import Egresos from "@/pages/egresos";
import TraspasosProductos from "@/pages/traspasos-productos";
import Transferencias from "@/pages/transferencias";
import Inventario from "@/pages/inventario";
import Kardex from "@/pages/kardex";
import Apertura from "@/pages/apertura";
import Cierre from "@/pages/cierre";
import Reportes from "@/pages/reportes";
import Proveedores from "@/pages/proveedores";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, requireStore = true, adminOnly = false, ...rest }: any) {
  const { isAuthenticated, checkAuth, currentStore, user } = useAuthStore();
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      const valid = await checkAuth();
      if (!valid) {
        setShouldRedirect("/login");
      }
      setIsChecking(false);
    };
    verify();
  }, []);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      setShouldRedirect("/login");
    } else if (!isChecking && requireStore && !currentStore) {
      setShouldRedirect("/select-store");
    } else if (!isChecking && adminOnly && user?.role !== "admin") {
      setShouldRedirect("/");
    }
  }, [isChecking, isAuthenticated, currentStore, requireStore, adminOnly, user]);

  useEffect(() => {
    if (shouldRedirect) {
      setLocation(shouldRedirect);
    }
  }, [shouldRedirect, setLocation]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || (requireStore && !currentStore) || (adminOnly && user?.role !== "admin")) {
    return null;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Switch>
      <Route path="/login">
        {() => {
          if (isAuthenticated) {
            setTimeout(() => setLocation("/select-store"), 0);
            return null;
          }
          return <Login />;
        }}
      </Route>

      <Route path="/select-store">
        {() => {
          if (!isAuthenticated) {
            setTimeout(() => setLocation("/login"), 0);
            return null;
          }
          return <SelectStore />;
        }}
      </Route>

      <Route path="/">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>

      <Route path="/ventas">
        {() => <PrivateRoute component={Ventas} />}
      </Route>

      <Route path="/devoluciones">
        {() => <PrivateRoute component={Devoluciones} />}
      </Route>

      <Route path="/egresos">
        {() => <PrivateRoute component={Egresos} />}
      </Route>

      <Route path="/traspasos-productos">
        {() => <PrivateRoute component={TraspasosProductos} />}
      </Route>

      <Route path="/transferencias">
        {() => <PrivateRoute component={Transferencias} />}
      </Route>

      <Route path="/inventario">
        {() => <PrivateRoute component={Inventario} />}
      </Route>

      <Route path="/kardex">
        {() => <PrivateRoute component={Kardex} />}
      </Route>

      <Route path="/apertura">
        {() => <PrivateRoute component={Apertura} />}
      </Route>

      <Route path="/cierre">
        {() => <PrivateRoute component={Cierre} />}
      </Route>

      <Route path="/reportes">
        {() => <PrivateRoute component={Reportes} />}
      </Route>

      <Route path="/proveedores">
        {() => <PrivateRoute component={Proveedores} adminOnly={true} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
