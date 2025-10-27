import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { notifications } from './notifications';

export interface ResultadoCancelacion {
  reservasCanceladas: number;
  errores: string[];
}

export const useAutoCancelarReservas = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancelarReservasVencidas = async (): Promise<ResultadoCancelacion> => {
    try {
      const ahora = new Date();
      const fechaActual = ahora.toISOString().split('T')[0];
      const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5);

      // Buscar reservas que han pasado su hora de fin y no están canceladas
      const { data: reservasVencidas, error } = await supabase
        .from('reserva')
        .select('*')
        .eq('estado_reserva', 'confirmada')
        .eq('fecha_reserva', fechaActual)
        .lt('hora_fin', horaActual);

      if (error) {
        return { reservasCanceladas: 0, errores: [error.message] };
      }

      if (!reservasVencidas || reservasVencidas.length === 0) {
        return { reservasCanceladas: 0, errores: [] };
      }

      // Cancelar las reservas vencidas
      const { error: updateError } = await supabase
        .from('reserva')
        .update({ estado_reserva: 'cancelada' })
        .in('id_reserva', reservasVencidas.map(r => r.id_reserva));

      if (updateError) {
        return { reservasCanceladas: 0, errores: [updateError.message] };
      }

      // Mostrar notificación
      if (reservasVencidas.length > 0) {
        notifications.info(`${reservasVencidas.length} reserva(s) cancelada(s) automáticamente por vencimiento`);
      }

      return { reservasCanceladas: reservasVencidas.length, errores: [] };
    } catch (error) {
      return { 
        reservasCanceladas: 0, 
        errores: [error instanceof Error ? error.message : 'Error desconocido'] 
      };
    }
  };

  useEffect(() => {
    // Ejecutar cada minuto
    intervalRef.current = setInterval(cancelarReservasVencidas, 60000);

    // Ejecutar inmediatamente
    cancelarReservasVencidas();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { cancelarReservasVencidas };
};