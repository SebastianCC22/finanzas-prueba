import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequireOpeningProps {
  children: React.ReactNode;
  onStatusChange?: (hasOpening: boolean) => void;
}

export function RequireOpening({ children, onStatusChange }: RequireOpeningProps) {
  const { currentStore } = useAuthStore();
  const [hasOpening, setHasOpening] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOpening();
  }, [currentStore]);

  const checkOpening = async () => {
    if (!currentStore) {
      setIsLoading(false);
      return;
    }

    try {
      const opening = await api.getTodayOpening(currentStore.id);
      const status = !!opening;
      setHasOpening(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error("Error checking opening:", error);
      setHasOpening(false);
      onStatusChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasOpening) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-8 max-w-md text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
            <LockKeyhole className="h-8 w-8 text-amber-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Caja no abierta
          </h2>
          
          <p className="text-slate-500 mb-6">
            Debe realizar la apertura de caja para poder realizar operaciones en esta sección.
          </p>
          
          <Link href="/apertura">
            <Button className="gap-2" data-testid="button-go-to-opening">
              Ir a Apertura de Caja
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function useOpeningStatus() {
  const { currentStore } = useAuthStore();
  const [hasOpening, setHasOpening] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOpening();
  }, [currentStore]);

  const checkOpening = async () => {
    if (!currentStore) {
      setIsLoading(false);
      return;
    }

    try {
      const opening = await api.getTodayOpening(currentStore.id);
      setHasOpening(!!opening);
    } catch (error) {
      console.error("Error checking opening:", error);
      setHasOpening(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    checkOpening();
  };

  return { hasOpening, isLoading, refresh };
}
