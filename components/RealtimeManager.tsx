'use client';

import { useReservasRealtime } from '@/lib/useReservasRealtime';
import { useCanchasRealtimeNotifications } from '@/lib/useCanchasRealtimeNotifications';
import { useClientesRealtime } from '@/lib/useClientesRealtime';

/**
 * Componente global que mantiene activas todas las suscripciones de Realtime
 * Se monta en el layout principal para que las notificaciones funcionen en toda la app
 */
export function RealtimeManager() {
  // Invocar todos los hooks de realtime para mantener las suscripciones activas
  // Solo necesitamos el efecto secundario (notificaciones), no el resultado
  useReservasRealtime();
  useCanchasRealtimeNotifications();
  useClientesRealtime();
  
  // usePagosRealtime no se incluye aquí porque maneja su propio estado
  // y se usa directamente en la página de pagos
  
  // Este componente no renderiza nada, solo mantiene las suscripciones activas
  return null;
}
