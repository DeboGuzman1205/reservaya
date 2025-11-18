import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import notifications from './notifications';

export interface Pago {
  id_pago: number;
  id_reserva: number;
  monto: number;
  estado_pago: 'aprobado' | 'pendiente' | 'cancelado' | 'desconocido';
  mp_id?: string | null;
  fecha_pago: string;
}

interface UsePagosRealtimeResult {
  pagos: Pago[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  crearPago: (pago: Omit<Pago, 'id_pago' | 'fecha_pago'>) => Promise<void>;
  actualizarPago: (id_pago: number, data: { estado_pago: string; mp_id?: string }) => Promise<void>;
}

export function usePagosRealtime(): UsePagosRealtimeResult {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar pagos
  const loadPagos = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/pagos');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'Error al cargar pagos'}`);
      }
      
      const data = await response.json();
      setPagos(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar pagos';
      setError(`${errorMessage}. Verifica que la tabla 'pago' exista en Supabase.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para refrescar datos
  const refresh = useCallback(async () => {
    setLoading(true);
    await loadPagos();
  }, [loadPagos]);

  // Función para crear pago
  const crearPago = useCallback(async (nuevoPago: Omit<Pago, 'id_pago' | 'fecha_pago'>) => {
    try {
      setError(null);
      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoPago),
      });

      if (!response.ok) {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Error al crear pago');
        throw new Error(errorData.error || 'Error al crear pago');
      }

      notifications.success(`Pago de $${nuevoPago.monto.toLocaleString()} creado exitosamente`);
      
      // No necesitamos actualizar manualmente, realtime se encarga
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear pago';
      setError(errorMessage);
      if (!err?.toString().includes('Error al crear pago')) {
        notifications.error('Error inesperado al crear el pago');
      }
      throw err;
    }
  }, []);

  // Función para actualizar pago
  const actualizarPago = useCallback(async (id_pago: number, data: { estado_pago: string; mp_id?: string }) => {
    try {
      setError(null);
      const response = await fetch('/api/pagos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pago, ...data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Error al actualizar pago');
        throw new Error(errorData.error || 'Error al actualizar pago');
      }

      // Mostrar notificación específica según el estado
      if (data.estado_pago === 'aprobado') {
        notifications.success(`🎉 ¡Pago aprobado exitosamente!`, {
          duration: 5000,
          icon: '✅'
        });
      } else if (data.estado_pago === 'cancelado') {
        notifications.error(`Pago marcado como cancelado`, {
          duration: 4000,
          icon: '❌'
        });
      } else {
        notifications.info(`Estado del pago actualizado a: ${data.estado_pago}`, {
          duration: 3000
        });
      }
      
      // No necesitamos actualizar manualmente, realtime se encarga
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar pago';
      setError(errorMessage);
      if (!err?.toString().includes('Error al actualizar pago')) {
        notifications.error('Error inesperado al actualizar el pago');
      }
      throw err;
    }
  }, []);

  // Configurar realtime
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Cargar datos iniciales
    loadPagos();

    // Configurar suscripción realtime solo si está disponible
    try {
      channel = supabase
        .channel('pagos-realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuchar todos los eventos
            schema: 'public',
            table: 'pago'
          },
          async (payload) => {
            
            if (!mounted) return;

            // Mostrar notificación según el evento
            if (payload.eventType === 'INSERT') {
              const nuevoPago = payload.new as Pago;
              const monto = nuevoPago.monto ? `$${nuevoPago.monto.toLocaleString()}` : '';
              notifications.success(`💰 Nuevo pago recibido ${monto}`, {
                duration: 6000,
                icon: '💳',
                style: {
                  background: '#059669',
                  color: '#fff',
                  fontWeight: 'bold'
                }
              });
            } else if (payload.eventType === 'UPDATE') {
              const pagoActualizado = payload.new as Pago;
              const estadoEmoji = pagoActualizado.estado_pago === 'aprobado' ? '✅' : 
                                 pagoActualizado.estado_pago === 'cancelado' ? '❌' : '⏳';
              
              if (pagoActualizado.estado_pago === 'aprobado') {
                notifications.success(`${estadoEmoji} Pago aprobado - $${pagoActualizado.monto?.toLocaleString()}`, {
                  duration: 5000,
                  icon: '🎉'
                });
              } else {
                notifications.info(`${estadoEmoji} Pago ${pagoActualizado.estado_pago}`, {
                  duration: 4000
                });
              }
            }

            // Recargar datos cuando hay cambios
            try {
              await loadPagos();
            } catch {
            }
          }
        )
        .subscribe((status) => {
          
          // Verificar estado de error del realtime
          if (status && typeof status === 'string' && status.includes('ERROR')) {
          }
        });
    } catch {
    }

    // Cleanup
    return () => {
      mounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
        }
      }
    };
  }, [loadPagos]);

  return {
    pagos,
    loading,
    error,
    refresh,
    crearPago,
    actualizarPago
  };
}
