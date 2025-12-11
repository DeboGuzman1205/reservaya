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
        .channel('reservas-global-listener')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reserva'
          },
          async (payload) => {
            if (!mounted) return;

            const reserva = payload.new as Record<string, unknown>;
            const estado = reserva.estado_reserva as string;
            const horario = reserva.hora_inicio && reserva.hora_fin
              ? ` (${reserva.hora_inicio} - ${reserva.hora_fin})`
              : '';

            // PASO 1: Notificación optimista INMEDIATA (sin esperar consultas)
            // Esto garantiza que siempre se vea algo, incluso si las consultas fallan
            let clienteNombre = 'Cliente';
            let canchaNombre = 'Cancha';

            try {
              // PASO 2: Intentar obtener datos adicionales (puede fallar en producción)
              const idCliente = reserva.id_cliente;
              const idCancha = reserva.id_cancha;

              if (idCliente && idCancha) {
                const results = await Promise.race([
                  Promise.all([
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
                  ]),
                  // Timeout de 2 segundos
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 2000)
                  )
                ]) as [
                  { data: { nombre: string; apellido: string } | null },
                  { data: { nombre: string } | null }
                ];
                
                const [clienteRes, canchaRes] = results;

                if (clienteRes?.data) {
                  clienteNombre = `${clienteRes.data.nombre} ${clienteRes.data.apellido}`.trim();
                }
                
                if (canchaRes?.data) {
                  canchaNombre = canchaRes.data.nombre;
                }
              }
            } catch {
              // Si falla, usar valores por defecto (ya están asignados)
              clienteNombre = `Cliente #${reserva.id_cliente}`;
              canchaNombre = `Cancha #${reserva.id_cancha}`;
            }

            // PASO 3: Mostrar notificación con los datos disponibles
            if (estado === 'pendiente') {
              notifications.warning(
                `⏳ Reserva pendiente: ${clienteNombre} - ${canchaNombre}${horario}`,
                { duration: 6000 }
              );
            } else if (estado === 'confirmada') {
              notifications.success(
                `✅ Reserva confirmada: ${clienteNombre} - ${canchaNombre}${horario}`,
                { duration: 6000 }
              );
            } else {
              notifications.success(
                `📅 Nueva reserva: ${clienteNombre} - ${canchaNombre}${horario}`,
                { duration: 6000 }
              );
            }

            if (callbackRef.current) callbackRef.current();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reserva'
          },
          (payload) => {
            if (!mounted) return;

            const reservaAnterior = payload.old as Record<string, unknown>;
            const reservaNueva = payload.new as Record<string, unknown>;

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

            if (callbackRef.current) callbackRef.current();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'reserva'
          },
          (payload) => {
            if (!mounted) return;
            const reserva = payload.old as Record<string, unknown>;
            notifications.info(`🗑️ Reserva #${reserva.id_reserva} eliminada`, {
              duration: 4000
            });
            if (callbackRef.current) callbackRef.current();
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
