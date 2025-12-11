import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export function useCanchasRealtimeNotifications() {
  useEffect(() => {
    console.log('🔌 Intentando conectar a Realtime Canchas...');

    const channel = supabase
      .channel('canchas-tracker-v2') // Nombre único para evitar conflictos
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todo (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'cancha',
        },
        (payload) => {
          console.log('📨 Evento recibido en Canchas:', payload); // DEBUG

          // Manejo de INSERT
          if (payload.eventType === 'INSERT') {
            const cancha = payload.new as Record<string, unknown>;
            const nombreCancha = cancha.nombre || `Cancha #${cancha.id_cancha}`;
            const tipo = cancha.tipo ? ` (${cancha.tipo})` : '';
            notifications.success(`🏟️ Nueva cancha: ${nombreCancha}${tipo}`, {
              duration: 5000
            });
          }
          
          // Manejo de UPDATE
          if (payload.eventType === 'UPDATE') {
            const canchaAnterior = payload.old as Record<string, unknown>;
            const canchaNueva = payload.new as Record<string, unknown>;
            const nombreCancha = canchaNueva.nombre || `Cancha #${canchaNueva.id_cancha}`;

            if (canchaAnterior.estado_cancha !== canchaNueva.estado_cancha) {
              const estado = canchaNueva.estado_cancha as string;
              
              if (estado === 'disponible') {
                notifications.success(`✅ ${nombreCancha} ahora está disponible`, {
                  duration: 5000
                });
              } else if (estado === 'mantenimiento') {
                notifications.warning(`🔧 ${nombreCancha} en mantenimiento`, {
                  duration: 5000
                });
              } else if (estado === 'no disponible') {
                notifications.info(`🔴 ${nombreCancha} no disponible`, {
                  duration: 4000
                });
              } else {
                notifications.info(`📝 ${nombreCancha}: estado actualizado`, {
                  duration: 4000
                });
              }
            } else {
              notifications.info(`📝 Cancha actualizada: ${nombreCancha}`, {
                duration: 4000
              });
            }
          }

          // Manejo de DELETE
          if (payload.eventType === 'DELETE') {
            const cancha = payload.old as Record<string, unknown>;
            const nombreCancha = cancha.nombre || `Cancha #${cancha.id_cancha}`;
            notifications.warning(`🗑️ Cancha eliminada: ${nombreCancha}`, {
              duration: 4000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
