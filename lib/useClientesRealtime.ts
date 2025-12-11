import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export function useClientesRealtime(onClienteChange?: () => void) {
  const callbackRef = useRef(onClienteChange);
  
  // Actualizar ref cuando el callback cambie
  useEffect(() => {
    callbackRef.current = onClienteChange;
  }, [onClienteChange]);
  
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel('clientes-notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cliente'
          },
          (payload) => {
            if (!mounted) return;

            // Notificaciones según el tipo de evento
            if (payload.eventType === 'INSERT') {
              const cliente = payload.new as Record<string, unknown>;
              const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
              notifications.success(`👤 Nuevo cliente: ${nombreCompleto || 'Cliente sin nombre'}`, {
                duration: 5000,
                icon: '✨'
              });
            } else if (payload.eventType === 'UPDATE') {
              const cliente = payload.new as Record<string, unknown>;
              const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
              notifications.info(`📝 Cliente actualizado: ${nombreCompleto || `#${cliente.id_cliente}`}`, {
                duration: 4000
              });
            } else if (payload.eventType === 'DELETE') {
              const cliente = payload.old as Record<string, unknown>;
              const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
              notifications.info(`🗑️ Cliente eliminado: ${nombreCompleto || `#${cliente.id_cliente}`}`, {
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
