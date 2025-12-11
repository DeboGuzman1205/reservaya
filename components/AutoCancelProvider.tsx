'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoCancelProviderProps {
  children: React.ReactNode;
}

export const AutoCancelProvider = ({ children }: AutoCancelProviderProps) => {
  const router = useRouter();

  useEffect(() => {
    const checkCancellations = async () => {
      try {
        const response = await fetch('/api/reservas/auto-cancelar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;

        const resultado = await response.json();
        
        if (resultado.success && resultado.canceladas > 0) {
          const currentPath = window.location.pathname;
          
          if (currentPath.includes('/reservas') || currentPath.includes('/dashboard')) {
            router.refresh();
          }
        }
      } catch {}
    };

    checkCancellations();

    const interval = setInterval(checkCancellations, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [router]);

  return <>{children}</>;
};
