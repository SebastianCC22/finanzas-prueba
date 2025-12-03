import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useStore } from "@/lib/store";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Movements from "@/pages/movements";
import Cuentas from "@/pages/cuentas";
import Apertura from "@/pages/apertura";
import Cierre from "@/pages/cierre";
import Transferencias from "@/pages/transferencias";
import Inventario from "@/pages/inventario";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, ...rest }: any) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const [, setLocation] = useLocation();
  
  return (
    <Switch>
      <Route path="/login">
        {() => {
           if (isAuthenticated) {
             setTimeout(() => setLocation("/"), 0);
             return null;
           }
           return <Login />;
        }}
      </Route>
      
      <Route path="/">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>
      
      <Route path="/ingresos">
        {() => <PrivateRoute component={() => <Movements type="ingreso" />} />}
      </Route>
      
      <Route path="/egresos">
        {() => <PrivateRoute component={() => <Movements type="egreso" />} />}
      </Route>
      
      <Route path="/cuentas">
        {() => <PrivateRoute component={Cuentas} />}
      </Route>
      
      <Route path="/apertura">
        {() => <PrivateRoute component={Apertura} />}
      </Route>
      
      <Route path="/cierre">
        {() => <PrivateRoute component={Cierre} />}
      </Route>
      
      <Route path="/transferencias">
        {() => <PrivateRoute component={Transferencias} />}
      </Route>
      
      <Route path="/inventario">
        {() => <PrivateRoute component={Inventario} />}
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
