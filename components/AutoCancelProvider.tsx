'use client';

import { useAutoCancelarReservas, type ResultadoCancelacion } from '../lib/useAutoCancelarReservas';
import { useEffect } from 'react';

interface AutoCancelProviderProps {
  children: React.ReactNode;
}

export const AutoCancelProvider = ({ children }: AutoCancelProviderProps) => {
  const { ejecutarManualmente } = useAutoCancelarReservas({
    intervalMinutos: 1, // Revisar cada minuto
    habilitado: true,
    onCancelacion: (resultado: ResultadoCancelacion) => {
      // Solo recargar si se cancelaron reservas
      if (resultado.success && resultado.canceladas > 0) {
        
        // Recargar la página si estamos en páginas relevantes
        if (resultado.canceladas > 0) {
          const currentPath = window.location.pathname;
          if (currentPath.includes('/reservas') || currentPath.includes('/dashboard')) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      }
    }
  });

  // Ejecutar una limpieza inicial al montar la aplicación
  useEffect(() => {
    const ejecutarLimpiezaInicial = async () => {
      try {
        await ejecutarManualmente();
      } catch {
        // Silenciar errores de limpieza inicial
      }
    };

    // Ejecutar después de un pequeño delay para permitir que se inicialice la app
    const timeoutId = setTimeout(ejecutarLimpiezaInicial, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [ejecutarManualmente]);

  return <>{children}</>;
};