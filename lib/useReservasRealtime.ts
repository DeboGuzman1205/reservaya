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
              const idCliente = reserva.id_cliente;
              const idCancha = reserva.id_cancha;
              
              // Obtener datos del cliente y cancha
              let clienteNombre = `Cliente #${idCliente}`;
              let canchaNombre = `Cancha #${idCancha}`;
              
              try {
                // Verificar que tengamos los IDs necesarios
                if (idCliente && idCancha) {
                  const [clienteRes, canchaRes] = await Promise.all([
                    supabase
                      .from('cliente')
                      .select('nombre, apellido')
                      .eq('id_cliente', idCliente)
                      .maybeSingle(),
                    supabase
                      .from('cancha')
                      .select('nombre')
                      .eq('id_cancha', idCancha)
                      .maybeSingle()
                  ]);

                  if (clienteRes.data) {
                    clienteNombre = `${clienteRes.data.nombre} ${clienteRes.data.apellido}`.trim();
                  }
                  
                  if (canchaRes.data) {
                    canchaNombre = canchaRes.data.nombre;
                  }
                }
                
                const horario = reserva.hora_inicio && reserva.hora_fin
                  ? ` (${reserva.hora_inicio} - ${reserva.hora_fin})`
                  : '';

                // Mostrar notificación según el estado de la reserva
                if (estado === 'pendiente') {
                  notifications.warning(
                    `⏳ Reserva pendiente: ${clienteNombre} - ${canchaNombre}${horario}`,
                    {
                      duration: 6000
                    }
                  );
                } else if (estado === 'confirmada') {
                  notifications.success(
                    `✅ Reserva confirmada: ${clienteNombre} - ${canchaNombre}${horario}`,
                    {
                      duration: 6000
                    }
                  );
                } else {
                  notifications.success(
                    `📅 Nueva reserva: ${clienteNombre} - ${canchaNombre}${horario}`,
                    {
                      duration: 6000
                    }
                  );
                }
              } catch {
                // Si falla la consulta, mostrar con los IDs
                const horario = reserva.hora_inicio && reserva.hora_fin
                  ? ` (${reserva.hora_inicio} - ${reserva.hora_fin})`
                  : '';
                  
                if (estado === 'pendiente') {
                  notifications.warning(`⏳ Reserva pendiente: ${clienteNombre} - ${canchaNombre}${horario}`);
                } else {
                  notifications.success(`📅 Nueva reserva: ${clienteNombre} - ${canchaNombre}${horario}`);
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
                    duration: 5000
                  });
                } else if (estado === 'pendiente') {
                  notifications.warning(`⏳ Reserva #${reservaNueva.id_reserva} pendiente de pago`, {
                    duration: 5000
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
