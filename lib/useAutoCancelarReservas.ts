'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface ResultadoCancelacion {
  success: boolean;
  canceladas: number;
  mensaje?: string;
  error?: string;
  reservas?: Array<{
    id_reserva: number;
    fecha_reserva: string;
    hora_inicio: string;
    created_at: string;
  }>;
}

interface UseAutoCancelarReservasOptions {
  intervalMinutos?: number;
  habilitado?: boolean;
  onCancelacion?: (resultado: ResultadoCancelacion) => void;
}

export const useAutoCancelarReservas = ({
  intervalMinutos = 1,
  habilitado = true,
  onCancelacion
}: UseAutoCancelarReservasOptions = {}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!habilitado) {
      return;
    }

    const ejecutarCancelacion = async () => {
      try {
        const response = await fetch('/api/reservas/auto-cancelar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const resultado: ResultadoCancelacion = await response.json();
          
          if (resultado.success && resultado.canceladas > 0) {
            onCancelacion?.(resultado);
          }
        }
      } catch {
      }
    };

    ejecutarCancelacion();

    intervalRef.current = setInterval(ejecutarCancelacion, intervalMinutos * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMinutos, habilitado, onCancelacion]);

  const ejecutarManualmente = useCallback(async () => {
    try {
      const response = await fetch('/api/reservas/auto-cancelar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const resultado: ResultadoCancelacion = await response.json();
        
        if (resultado.success && resultado.canceladas > 0) {
          onCancelacion?.(resultado);
        }
        
        return resultado;
      }
      
      return { success: false, canceladas: 0, mensaje: 'Error en la respuesta del servidor' };
    } catch (error) {
      const errorResult: ResultadoCancelacion = {
        success: false,
        canceladas: 0,
        mensaje: 'Error al ejecutar auto-cancelación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      
      onCancelacion?.(errorResult);
      return errorResult;
    }
  }, [onCancelacion]);

  return { ejecutarManualmente };
};