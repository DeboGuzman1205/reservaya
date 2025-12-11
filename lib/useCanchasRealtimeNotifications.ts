import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export function useCanchasRealtimeNotifications(onCanchaChange?: () => void) {
  const callbackRef = useRef(onCanchaChange);
  
  // Actualizar ref cuando el callback cambie
  useEffect(() => {
    callbackRef.current = onCanchaChange;
  }, [onCanchaChange]);
  
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel('canchas-notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cancha'
          },
          (payload) => {
            if (!mounted) return;

            // Notificaciones según el tipo de evento
            if (payload.eventType === 'INSERT') {
              const cancha = payload.new as Record<string, unknown>;
              const nombreCancha = cancha.nombre || `Cancha #${cancha.id_cancha}`;
              const tipo = cancha.tipo ? ` (${cancha.tipo})` : '';
              notifications.success(`🏟️ Nueva cancha: ${nombreCancha}${tipo}`, {
                duration: 5000
              });
            } else if (payload.eventType === 'UPDATE') {
              const canchaAnterior = payload.old as Record<string, unknown>;
              const canchaNueva = payload.new as Record<string, unknown>;
              const nombreCancha = canchaNueva.nombre || `Cancha #${canchaNueva.id_cancha}`;

              // Solo notificar si cambió el estado
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
            } else if (payload.eventType === 'DELETE') {
              const cancha = payload.old as Record<string, unknown>;
              const nombreCancha = cancha.nombre || `Cancha #${cancha.id_cancha}`;
              notifications.info(`🗑️ Cancha eliminada: ${nombreCancha}`, {
                duration: 4000
              });
            }

            // Llamar callback si existe
            if (callbackRef.current) {
              callbackRef.current();
            }
          }
        )
        .subscribe();
    } catch {
      // Silencioso en producción
    }

    return () => {
      mounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // Silencioso
        }
      }
    };
  }, []); // Sin dependencias para que el canal persista
}
