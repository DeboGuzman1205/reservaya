import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export function useReservasRealtime() {
  useEffect(() => {
    console.log('🔌 Intentando conectar a Realtime Reservas...');

    const channel = supabase
      .channel('reservas-tracker-v2') // Nombre único para evitar conflictos
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todo (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'reserva',
        },
        async (payload) => {
          console.log('📨 Evento recibido en Reservas:', payload); // DEBUG

          // Manejo de INSERT
          if (payload.eventType === 'INSERT') {
            const reserva = payload.new as Record<string, unknown>;
            const estado = reserva.estado_reserva as string;
            const horario = reserva.hora_inicio && reserva.hora_fin
              ? ` (${reserva.hora_inicio} - ${reserva.hora_fin})`
              : '';

            // Notificación optimista INMEDIATA (sin esperar consultas)
            let clienteNombre = 'Cliente';
            let canchaNombre = 'Cancha';

            try {
              // Intentar obtener datos adicionales con timeout
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
              clienteNombre = `Cliente #${reserva.id_cliente}`;
              canchaNombre = `Cancha #${reserva.id_cancha}`;
            }

            // Mostrar notificación
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
          }
          
          // Manejo de UPDATE
          if (payload.eventType === 'UPDATE') {
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
          }

          // Manejo de DELETE
          if (payload.eventType === 'DELETE') {
            const reserva = payload.old as Record<string, unknown>;
            notifications.warning(`🗑️ Reserva #${reserva.id_reserva} eliminada`, {
              duration: 4000
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Estado de conexión Reservas: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en el canal de realtime Reservas');
        }
      });

    return () => {
      console.log('🔌 Desconectando Realtime Reservas...');
      supabase.removeChannel(channel);
    };
  }, []);
}
