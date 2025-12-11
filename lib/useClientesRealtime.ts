import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Definimos la estructura exacta de tu tabla cliente
// (Si ya tienes este tipo en @/types, puedes importarlo en lugar de definirlo aquí)
interface Cliente {
  id_cliente: number;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_registro: string;
}

export function useClientesRealtime() {
  useEffect(() => {
    const channel = supabase
      .channel('clientes-monitor-v4')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cliente',
        },
        (payload: RealtimePostgresChangesPayload<Cliente>) => {

          if (payload.eventType === 'INSERT') {
            const nuevoCliente = payload.new as Cliente;
            
            if (nuevoCliente && nuevoCliente.nombre) {
              const nombreCompleto = `${nuevoCliente.nombre} ${nuevoCliente.apellido || ''}`.trim();
              notifications.success(`👤 Nuevo: ${nombreCompleto}`);
            }
          }

          if (payload.eventType === 'UPDATE') {
            const clienteActualizado = payload.new as Cliente;
            
            if (clienteActualizado && clienteActualizado.nombre) {
              const nombreCompleto = `${clienteActualizado.nombre} ${clienteActualizado.apellido || ''}`.trim();
              notifications.info(`📝 Actualizado: ${nombreCompleto}`);
            }
          }

          if (payload.eventType === 'DELETE') {
            const clienteEliminado = payload.old as Cliente;
            
            if (clienteEliminado && clienteEliminado.nombre) {
               const nombreCompleto = `${clienteEliminado.nombre} ${clienteEliminado.apellido || ''}`.trim();
               notifications.warning(`🗑️ Eliminado: ${nombreCompleto}`);
            } else {
               notifications.warning('🗑️ Cliente eliminado');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}