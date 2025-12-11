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
    // 1. Verificación de sesión (Diagnóstico)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        console.warn('⚠️ No hay sesión de usuario. RLS podría bloquear las notificaciones.');
      } else {
        console.log('✅ Sesión encontrada. Iniciando suscripción...');
      }
    });

    const channel = supabase
      .channel('clientes-monitor-v4') // Nombre único para limpiar caché del socket
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE y DELETE
          schema: 'public',
          table: 'cliente',
        },
        (payload: RealtimePostgresChangesPayload<Cliente>) => {
          console.log('📨 Payload recibido:', payload);

          // MANEJO DE INSERT (Nuevo Cliente)
          if (payload.eventType === 'INSERT') {
            // TypeScript sabe que 'payload.new' puede tener la forma de Cliente
            const nuevoCliente = payload.new as Cliente;
            
            if (nuevoCliente && nuevoCliente.nombre) {
              const nombreCompleto = `${nuevoCliente.nombre} ${nuevoCliente.apellido || ''}`.trim();
              notifications.success(`👤 Nuevo: ${nombreCompleto}`);
            }
          }

          // MANEJO DE UPDATE (Cliente Actualizado)
          if (payload.eventType === 'UPDATE') {
            const clienteActualizado = payload.new as Cliente;
            
            if (clienteActualizado && clienteActualizado.nombre) {
              const nombreCompleto = `${clienteActualizado.nombre} ${clienteActualizado.apellido || ''}`.trim();
              notifications.info(`📝 Actualizado: ${nombreCompleto}`);
            }
          }

          // MANEJO DE DELETE (Cliente Eliminado)
          if (payload.eventType === 'DELETE') {
            // Para DELETE, miramos 'payload.old'. 
            // IMPORTANTE: Requiere REPLICA IDENTITY FULL en la base de datos para ver nombre/apellido
            const clienteEliminado = payload.old as Cliente;
            
            if (clienteEliminado && clienteEliminado.nombre) {
               const nombreCompleto = `${clienteEliminado.nombre} ${clienteEliminado.apellido || ''}`.trim();
               notifications.warning(`🗑️ Eliminado: ${nombreCompleto}`);
            } else {
               // Si no hay REPLICA IDENTITY FULL, solo tendremos el ID
               notifications.warning('🗑️ Cliente eliminado');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 ESTADO DE CONEXIÓN: ${status}`);
        
        if (status === 'SUBSCRIBED') {
           // Opcional: Notificación visual solo para confirmar conexión
           // notifications.success('Conectado a servidor de clientes');
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error de canal. Revisa la consola del navegador y los logs de Supabase.');
        }
      });

    return () => {
      console.log('🔌 Desconectando canal...');
      supabase.removeChannel(channel);
    };
  }, []);
}