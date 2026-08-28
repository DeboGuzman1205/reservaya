'use client';

import { useReservasRealtime } from '@/lib/useReservasRealtime';
import { useCanchasRealtimeNotifications } from '@/lib/useCanchasRealtimeNotifications';
import { useClientesRealtime } from '@/lib/useClientesRealtime';
export function RealtimeManager() {
  useReservasRealtime();
  useCanchasRealtimeNotifications();
  useClientesRealtime();
  return null;
}
