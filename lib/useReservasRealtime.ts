import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export function useReservasRealtime(onReservaChange?: () => void) {
  const callbackRef = useRef(onReservaChange);
  
  // Actualizar ref cuando el callback cambie
  useEffect(() => {
    callbackRef.current = onReservaChange;
  }, [onReservaChange]);
  
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel('reservas-notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reserva'
          },
          async (payload) => {
            if (!mounted) return;

            // Notificaciones según el tipo de evento
            if (payload.eventType === 'INSERT') {
              const reserva = payload.new as Record<string, unknown>;
              const estado = reserva.estado_reserva as string;
              
              // Obtener datos del cliente y cancha
              try {
                const [clienteRes, canchaRes] = await Promise.all([
                  supabase
                    .from('cliente')
                    .select('nombre, apellido')
                    .eq('id_cliente', reserva.id_cliente)
                    .single(),
                  supabase
                    .from('cancha')
                    .select('nombre')
                    .eq('id_cancha', reserva.id_cancha)
                    .single()
                ]);

                const clienteNombre = clienteRes.data
                  ? `${clienteRes.data.nombre} ${clienteRes.data.apellido}`
                  : 'Cliente desconocido';
                const canchaNombre = canchaRes.data?.nombre || 'Cancha desconocida';
                const horario = reserva.hora_inicio && reserva.hora_fin
                  ? `${reserva.hora_inicio} - ${reserva.hora_fin}`
                  : '';

                // Mostrar notificación según el estado de la reserva
                if (estado === 'pendiente') {
                  notifications.warning(
                    `⏳ Reserva pendiente: ${clienteNombre} - ${canchaNombre}${horario ? ` (${horario})` : ''}`,
                    {
                      duration: 6000,
                      icon: '⏰'
                    }
                  );
                } else if (estado === 'confirmada') {
                  notifications.success(
                    `✅ Reserva confirmada: ${clienteNombre} - ${canchaNombre}${horario ? ` (${horario})` : ''}`,
                    {
                      duration: 6000,
                      icon: '🎉'
                    }
                  );
                } else {
                  notifications.success(
                    `📅 Nueva reserva: ${clienteNombre} - ${canchaNombre}${horario ? ` (${horario})` : ''}`,
                    {
                      duration: 6000,
                      icon: '🎉'
                    }
                  );
                }
              } catch {
                if (estado === 'pendiente') {
                  notifications.warning('⏳ Nueva reserva pendiente de pago');
                } else {
                  notifications.success('📅 Nueva reserva creada');
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const reservaAnterior = payload.old as Record<string, unknown>;
              const reservaNueva = payload.new as Record<string, unknown>;

              // Solo notificar si cambió el estado
              if (reservaAnterior.estado_reserva !== reservaNueva.estado_reserva) {
                const estado = reservaNueva.estado_reserva as string;
                
                if (estado === 'cancelada') {
                  notifications.warning(`❌ Reserva #${reservaNueva.id_reserva} cancelada`, {
                    duration: 5000
                  });
                } else if (estado === 'confirmada') {
                  notifications.success(`✅ Reserva #${reservaNueva.id_reserva} confirmada`, {
                    duration: 5000,
                    icon: '🎯'
                  });
                } else if (estado === 'pendiente') {
                  notifications.warning(`⏳ Reserva #${reservaNueva.id_reserva} pendiente de pago`, {
                    duration: 5000,
                    icon: '⏰'
                  });
                } else {
                  notifications.info(`📝 Reserva #${reservaNueva.id_reserva}: ${estado}`, {
                    duration: 4000
                  });
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const reserva = payload.old as Record<string, unknown>;
              notifications.info(`🗑️ Reserva #${reserva.id_reserva} eliminada`, {
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
