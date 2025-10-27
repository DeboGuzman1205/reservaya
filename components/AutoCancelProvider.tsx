'use client';

import { useEffect } from 'react';

interface AutoCancelProviderProps {
  children: React.ReactNode;
}

export const AutoCancelProvider = ({ children }: AutoCancelProviderProps) => {
  useEffect(() => {
    const checkCancellations = async () => {
      try {
        // Llamar al endpoint de auto-cancelar para reservas pendientes vencidas
        const response = await fetch('/api/reservas/auto-cancelar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
        }

        const resultado = await response.json();
        
        // Recargar la página si se cancelaron reservas
        if (resultado.success && resultado.canceladas > 0) {
          const currentPath = window.location.pathname;
          if (currentPath.includes('/reservas') || currentPath.includes('/dashboard')) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error al verificar cancelaciones automáticas:', error);
      }
    };

    // Ejecutar inmediatamente
    checkCancellations();

    // Configurar intervalo cada 30 segundos (más frecuente para mejor responsividad)
    const interval = setInterval(checkCancellations, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
};