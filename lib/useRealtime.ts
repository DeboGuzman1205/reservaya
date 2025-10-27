import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  RealtimeChannel, 
  RealtimePostgresChangesPayload,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT
} from '@supabase/supabase-js';

// Función para llamar notificaciones de manera segura
function callNotification(method: string, ...args: unknown[]) {
  import('./notifications').then((notificationsModule) => {
    const realtimeNotifications = notificationsModule.realtimeNotifications;
    const methodFunction = realtimeNotifications?.[method as keyof typeof realtimeNotifications];
    
    if (typeof methodFunction === 'function') {
      return (methodFunction as (...params: unknown[]) => void)(...args);
    }
  }).catch(() => {
    // Silencioso en producción
  });
}

type TablaSupabase = 'reserva' | 'cancha' | 'cliente';
type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

interface UseRealtimeOptions {
  tabla: TablaSupabase;
  evento?: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT;
  filtro?: string;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  autoReconnect?: boolean;
}

interface UseDashboardRealtimeOptions {
  onReservaChange?: () => void;
  onCanchaChange?: () => void;
  onClienteChange?: () => void;
  enabled?: boolean;
  autoReconnect?: boolean;
}

// ========================================================================================
// GESTOR CENTRALIZADO DE CANALES REALTIME
// ========================================================================================

interface ChannelInfo {
  channel: RealtimeChannel;
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
  closeTimeout: NodeJS.Timeout | null;
  subscribers: Set<string>;
  callbacks: {
    onInsert: Set<(payload: RealtimePayload) => void>;
    onUpdate: Set<(payload: RealtimePayload) => void>;
    onDelete: Set<(payload: RealtimePayload) => void>;
  };
}

class RealtimeChannelManager {
  private static instance: RealtimeChannelManager | null = null;
  private channels: Map<TablaSupabase, ChannelInfo> = new Map();
  private globalConnectionState = false;
  private lastNotificationState = false;
  private initialized = false;
  private initTimeout: NodeJS.Timeout | null = null;

  static getInstance(): RealtimeChannelManager {
    if (!RealtimeChannelManager.instance) {
      RealtimeChannelManager.instance = new RealtimeChannelManager();
    }
    return RealtimeChannelManager.instance;
  }

  private constructor() {
    this.initTimeout = setTimeout(() => {
      this.initialized = true;
    }, 2000);
  }

  private getOrCreateChannel(tabla: TablaSupabase): ChannelInfo {
    if (this.channels.has(tabla)) {
      return this.channels.get(tabla)!;
    }

    const channelName = `persistent_${tabla}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    const channelInfo: ChannelInfo = {
      channel,
      isConnected: false,
      error: null,
      reconnectAttempts: 0,
      reconnectTimeout: null,
      closeTimeout: null,
      subscribers: new Set(),
      callbacks: {
        onInsert: new Set(),
        onUpdate: new Set(),
        onDelete: new Set()
      }
    };

    this.setupChannelListeners(tabla, channelInfo);
    this.channels.set(tabla, channelInfo);
    this.subscribeChannel(tabla, channelInfo);
    
    return channelInfo;
  }

  private setupChannelListeners(tabla: TablaSupabase, channelInfo: ChannelInfo) {
    const { channel } = channelInfo;

    // Eventos de base de datos usando el método correcto
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tabla
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.handleDatabaseEvent('INSERT', tabla, payload, channelInfo);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tabla
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.handleDatabaseEvent('UPDATE', tabla, payload, channelInfo);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tabla
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          this.handleDatabaseEvent('DELETE', tabla, payload, channelInfo);
        }
      );

    // Eventos del sistema
    channel.on('system', {}, (payload: { type?: string; message?: string }) => {
      if (payload.type === 'connected') {
        channelInfo.isConnected = true;
        channelInfo.error = null;
        channelInfo.reconnectAttempts = 0;
        this.clearReconnectTimeout(channelInfo);
        this.updateGlobalConnectionState();
      } else if (payload.type === 'error') {
        channelInfo.isConnected = false;
        channelInfo.error = payload.message || 'Error de conexión';
        this.updateGlobalConnectionState();
      }
    });
  }

  private handleDatabaseEvent(
    event: 'INSERT' | 'UPDATE' | 'DELETE', 
    tabla: TablaSupabase, 
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
    channelInfo: ChannelInfo
  ) {
    // Ejecutar handlers de notificaciones
    const data = event === 'DELETE' ? payload.old || {} : payload.new || {};
    const oldData = event === 'UPDATE' ? payload.old || {} : undefined;

    this.triggerNotifications(event, tabla, data, oldData);

    // Ejecutar callbacks de componentes
    const callbackSet = event === 'INSERT' ? channelInfo.callbacks.onInsert :
                       event === 'UPDATE' ? channelInfo.callbacks.onUpdate :
                       channelInfo.callbacks.onDelete;

    callbackSet.forEach(callback => {
      try {
        callback(payload);
      } catch {
        // Silencioso en producción
      }
    });
  }

  private async triggerNotifications(
    event: string, 
    tabla: TablaSupabase, 
    data: Record<string, unknown>, 
    oldData?: Record<string, unknown>
  ) {
    try {
      if (tabla === 'reserva') {
        await this.handleReservaNotification(event, data, oldData);
      } else if (tabla === 'cancha') {
        this.handleCanchaNotification(event, data, oldData);
      } else if (tabla === 'cliente') {
        this.handleClienteNotification(event, data, oldData);
      }
    } catch {
      // Silencioso en producción
    }
  }

  private async handleReservaNotification(evento: string, data: Record<string, unknown>, oldData?: Record<string, unknown>) {
    switch (evento) {
      case 'INSERT':
        const insertDetails = await this.getReservaDetails(data, true);
        const horario = insertDetails.horaInicio && insertDetails.horaFin 
          ? `${insertDetails.horaInicio} - ${insertDetails.horaFin}` 
          : 'Horario no disponible';
        const fechaTexto = insertDetails.fechaReserva ? ` para el ${insertDetails.fechaReserva}` : '';
        callNotification('nuevaReserva', insertDetails.clienteNombre, insertDetails.canchaNombre, `${horario}${fechaTexto}`);
        break;
        
      case 'UPDATE':
        const updateDetails = await this.getReservaDetails(data, false);
        const estadoAnterior = (oldData?.estado_reserva as string) || '';
        if (estadoAnterior !== updateDetails.estadoReserva) {
          if (updateDetails.estadoReserva === 'cancelada') {
            const reservaId = data.id_reserva;
            const reservaNombre = reservaId ? `Reserva #${reservaId}` : 'Reserva';
            callNotification('reservaCancelada', reservaNombre);
          } else {
            callNotification('reservaActualizada', updateDetails.clienteNombre, updateDetails.canchaNombre, updateDetails.estadoReserva.toUpperCase());
          }
        }
        break;
        
      case 'DELETE':
        const reservaId = data.id_reserva;
        const clienteNombre = reservaId ? `Reserva #${reservaId}` : 'Reserva';
        callNotification('reservaCancelada', clienteNombre);
        break;
    }
  }

  private handleCanchaNotification(evento: string, data: Record<string, unknown>, oldData?: Record<string, unknown>) {
    const nombreCancha = (data.nombre as string) || `Cancha #${data.id_cancha || 'ID desconocido'}`;
    const estadoCancha = (data.estado_cancha as string) || '';
    const tipoCancha = (data.tipo as string) || '';

    switch (evento) {
      case 'INSERT':
        const tipoTexto = tipoCancha ? ` (${tipoCancha})` : '';
        callNotification('nuevaCancha', `${nombreCancha}${tipoTexto}`);
        break;
      case 'UPDATE':
        const estadoAnterior = (oldData?.estado_cancha as string) || '';
        if (estadoAnterior !== estadoCancha) {
          let cambio = `Estado: ${estadoCancha.toUpperCase()}`;
          if (estadoCancha === 'mantenimiento') {
            cambio = 'En mantenimiento';
          } else if (estadoCancha === 'disponible') {
            cambio = 'Disponible nuevamente';
          } else if (estadoCancha === 'ocupada') {
            cambio = 'Ocupada';
          }
          callNotification('canchaActualizada', nombreCancha, cambio);
        }
        break;
      case 'DELETE':
        callNotification('canchaEliminada', nombreCancha);
        break;
    }
  }

  private handleClienteNotification(evento: string, data: Record<string, unknown>, oldData?: Record<string, unknown>) {
    const nombreCliente = (data.nombre as string) || `Cliente #${data.id_cliente || 'ID desconocido'}`;

    switch (evento) {
      case 'INSERT':
        callNotification('nuevoCliente', nombreCliente);
        break;
      case 'UPDATE':
        callNotification('clienteActualizado', nombreCliente);
        break;
      case 'DELETE':
        const clienteEliminado = (oldData?.nombre as string) || `Cliente #${oldData?.id_cliente || 'ID desconocido'}`;
        callNotification('clienteEliminado', clienteEliminado);
        break;
    }
  }

  private async getReservaDetails(reservaData: Record<string, unknown>, obtenerNombres = false) {
    const keys = Object.keys(reservaData);
    
    // Caso DELETE: solo tiene id_reserva
    if (keys.length === 1 && keys[0] === 'id_reserva') {
      return {
        clienteNombre: `Reserva #${reservaData.id_reserva}`,
        canchaNombre: 'eliminada',
        horaInicio: '',
        horaFin: '',
        fechaReserva: '',
        estadoReserva: 'eliminada'
      };
    }

    const clienteId = reservaData.id_cliente;
    const canchaId = reservaData.id_cancha;

    // Si ya hay nombres en el payload, usarlos
    if (reservaData.cliente_nombre && reservaData.cancha_nombre) {
      return {
        clienteNombre: reservaData.cliente_nombre as string,
        canchaNombre: reservaData.cancha_nombre as string,
        horaInicio: reservaData.hora_inicio as string,
        horaFin: reservaData.hora_fin as string,
        fechaReserva: reservaData.fecha_reserva as string,
        estadoReserva: reservaData.estado_reserva as string
      };
    }

    let clienteNombre = `Cliente #${clienteId || 'desconocido'}`;
    let canchaNombre = `Cancha #${canchaId || 'desconocida'}`;

    // Solo hacer consultas si se solicitan nombres reales
    if (obtenerNombres && clienteId && canchaId) {
      try {
        const [clienteResult, canchaResult] = await Promise.all([
          supabase.from('cliente').select('nombre').eq('id_cliente', clienteId).maybeSingle(),
          supabase.from('cancha').select('nombre').eq('id_cancha', canchaId).maybeSingle()
        ]);

        if (clienteResult.data?.nombre) clienteNombre = clienteResult.data.nombre;
        if (canchaResult.data?.nombre) canchaNombre = canchaResult.data.nombre;
      } catch {
        // Mantener nombres con IDs si falla
      }
    }

    return {
      clienteNombre,
      canchaNombre,
      horaInicio: reservaData.hora_inicio as string || '',
      horaFin: reservaData.hora_fin as string || '',
      fechaReserva: reservaData.fecha_reserva as string || '',
      estadoReserva: reservaData.estado_reserva as string || ''
    };
  }

  private subscribeChannel(tabla: TablaSupabase, channelInfo: ChannelInfo) {
    const { channel } = channelInfo;
    
    channel.subscribe((status: string) => {
      switch (status) {
        case 'SUBSCRIBED':
          channelInfo.isConnected = true;
          channelInfo.error = null;
          channelInfo.reconnectAttempts = 0;
          this.clearReconnectTimeout(channelInfo);
          this.updateGlobalConnectionState();
          break;
          
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          channelInfo.isConnected = false;
          channelInfo.error = `Error en canal ${tabla}`;
          this.scheduleReconnect(tabla, channelInfo);
          this.updateGlobalConnectionState();
          break;
          
        case 'CLOSED':
          channelInfo.isConnected = false;
          channelInfo.error = null;
          if (channelInfo.subscribers.size > 0) {
            this.scheduleReconnect(tabla, channelInfo);
          }
          this.updateGlobalConnectionState();
          break;
      }
    });
  }

  private scheduleReconnect(tabla: TablaSupabase, channelInfo: ChannelInfo) {
    if (channelInfo.reconnectTimeout) {
      clearTimeout(channelInfo.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, channelInfo.reconnectAttempts), 30000);
    
    channelInfo.reconnectTimeout = setTimeout(() => {
      channelInfo.reconnectAttempts++;
      
      supabase.removeChannel(channelInfo.channel);
      
      const channelName = `persistent_${tabla}_${Date.now()}_reconnect`;
      const newChannel = supabase.channel(channelName);
      
      channelInfo.channel = newChannel;
      this.setupChannelListeners(tabla, channelInfo);
      this.subscribeChannel(tabla, channelInfo);
      
    }, delay);
  }

  private clearReconnectTimeout(channelInfo: ChannelInfo) {
    if (channelInfo.reconnectTimeout) {
      clearTimeout(channelInfo.reconnectTimeout);
      channelInfo.reconnectTimeout = null;
    }
    if (channelInfo.closeTimeout) {
      clearTimeout(channelInfo.closeTimeout);
      channelInfo.closeTimeout = null;
    }
  }

  private updateGlobalConnectionState() {
    const allChannelsConnected = Array.from(this.channels.values()).every(ch => ch.isConnected);
    const hasActiveChannels = this.channels.size > 0;
    const newState = hasActiveChannels && allChannelsConnected;
    
    if (newState !== this.lastNotificationState && hasActiveChannels && this.initialized) {
      if (newState && this.channels.size > 0) {
        callNotification('conectado');
      } else if (this.lastNotificationState && !newState && this.channels.size > 0) {
        callNotification('desconectado');
      }
      
      this.lastNotificationState = newState;
    } else if (!hasActiveChannels && this.lastNotificationState) {
      this.lastNotificationState = false;
    } else if (!this.initialized) {
      this.lastNotificationState = newState;
    }
    
    this.globalConnectionState = newState;
  }

  // Métodos públicos
  subscribe(
    tabla: TablaSupabase, 
    subscriberId: string,
    callbacks: {
      onInsert?: (payload: RealtimePayload) => void;
      onUpdate?: (payload: RealtimePayload) => void;
      onDelete?: (payload: RealtimePayload) => void;
    }
  ) {
    const channelInfo = this.getOrCreateChannel(tabla);
    
    if (channelInfo.closeTimeout) {
      clearTimeout(channelInfo.closeTimeout);
      channelInfo.closeTimeout = null;
    }
    
    channelInfo.subscribers.add(subscriberId);
    
    if (callbacks.onInsert) channelInfo.callbacks.onInsert.add(callbacks.onInsert);
    if (callbacks.onUpdate) channelInfo.callbacks.onUpdate.add(callbacks.onUpdate);
    if (callbacks.onDelete) channelInfo.callbacks.onDelete.add(callbacks.onDelete);
    
    return {
      isConnected: channelInfo.isConnected,
      error: channelInfo.error,
      reconnectAttempts: channelInfo.reconnectAttempts
    };
  }

  unsubscribe(tabla: TablaSupabase, subscriberId: string, callbacks?: {
    onInsert?: (payload: RealtimePayload) => void;
    onUpdate?: (payload: RealtimePayload) => void;
    onDelete?: (payload: RealtimePayload) => void;
  }) {
    const channelInfo = this.channels.get(tabla);
    if (!channelInfo) return;

    channelInfo.subscribers.delete(subscriberId);
    
    if (callbacks?.onInsert) channelInfo.callbacks.onInsert.delete(callbacks.onInsert);
    if (callbacks?.onUpdate) channelInfo.callbacks.onUpdate.delete(callbacks.onUpdate);
    if (callbacks?.onDelete) channelInfo.callbacks.onDelete.delete(callbacks.onDelete);
    
    if (channelInfo.subscribers.size === 0) {
      if (channelInfo.closeTimeout) {
        clearTimeout(channelInfo.closeTimeout);
      }
      
      channelInfo.closeTimeout = setTimeout(() => {
        if (channelInfo.subscribers.size === 0) {
          supabase.removeChannel(channelInfo.channel);
          this.clearReconnectTimeout(channelInfo);
          if (channelInfo.closeTimeout) {
            clearTimeout(channelInfo.closeTimeout);
          }
          this.channels.delete(tabla);
          this.updateGlobalConnectionState();
        }
      }, 30000);
    }
  }

  getConnectionStatus() {
    const connections: Record<string, boolean> = {};
    const errors: string[] = [];
    const reconnectAttempts: Record<string, number> = {};
    
    this.channels.forEach((channelInfo, tabla) => {
      connections[tabla] = channelInfo.isConnected;
      if (channelInfo.error) errors.push(channelInfo.error);
      reconnectAttempts[tabla] = channelInfo.reconnectAttempts;
    });
    
    return {
      isConnected: this.globalConnectionState,
      connections,
      errors,
      reconnectAttempts
    };
  }

  reconnectAll() {
    this.channels.forEach((channelInfo, tabla) => {
      channelInfo.reconnectAttempts = 0;
      channelInfo.error = null;
      this.clearReconnectTimeout(channelInfo);
      this.scheduleReconnect(tabla, channelInfo);
    });
  }

  disconnectAll() {
    this.channels.forEach((channelInfo) => {
      supabase.removeChannel(channelInfo.channel);
      this.clearReconnectTimeout(channelInfo);
    });
    this.channels.clear();
    this.globalConnectionState = false;
    
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    
    this.updateGlobalConnectionState();
  }

  resetNotificationState() {
    this.lastNotificationState = false;
    this.initialized = false;
    
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }
    this.initTimeout = setTimeout(() => {
      this.initialized = true;
    }, 1000);
  }
}

// ========================================================================================
// HOOKS OPTIMIZADOS
// ========================================================================================

const channelManager = RealtimeChannelManager.getInstance();

const useRealtimeSubscription = (options: UseRealtimeOptions) => {
  const [connectionInfo, setConnectionInfo] = useState({
    isConnected: false,
    error: null as string | null,
    reconnectAttempts: 0
  });
  
  const { tabla, onInsert, onUpdate, onDelete } = options;
  const subscriberIdRef = useRef<string>(`${tabla}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const isFirstMount = useRef(true);
  
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  
  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  }, [onInsert, onUpdate, onDelete]);

  const updateConnectionState = useCallback(() => {
    const status = channelManager.getConnectionStatus();
    setConnectionInfo({
      isConnected: status.connections[tabla] || false,
      error: status.errors.find(err => err.includes(tabla)) || null,
      reconnectAttempts: status.reconnectAttempts[tabla] || 0
    });
  }, [tabla]);

  useEffect(() => {
    const subscriberId = subscriberIdRef.current;
    
    if (isFirstMount.current) {
      channelManager.resetNotificationState();
      isFirstMount.current = false;
    }
    
    const callbacks = {
      onInsert: onInsertRef.current ? (payload: RealtimePayload) => {
        setTimeout(() => onInsertRef.current?.(payload), 0);
      } : undefined,
      onUpdate: onUpdateRef.current ? (payload: RealtimePayload) => {
        setTimeout(() => onUpdateRef.current?.(payload), 0);
      } : undefined,
      onDelete: onDeleteRef.current ? (payload: RealtimePayload) => {
        setTimeout(() => onDeleteRef.current?.(payload), 0);
      } : undefined,
    };
    
    const initialStatus = channelManager.subscribe(tabla, subscriberId, callbacks);
    
    setConnectionInfo({
      isConnected: initialStatus.isConnected,
      error: initialStatus.error,
      reconnectAttempts: initialStatus.reconnectAttempts
    });
    
    const statusInterval = setInterval(updateConnectionState, 2000);
    
    return () => {
      clearInterval(statusInterval);
      channelManager.unsubscribe(tabla, subscriberId, callbacks);
    };
  }, [tabla, updateConnectionState]);

  return {
    isConnected: connectionInfo.isConnected,
    error: connectionInfo.error,
    reconnectAttempts: connectionInfo.reconnectAttempts,
    disconnect: () => {
      const subscriberId = subscriberIdRef.current;
      channelManager.unsubscribe(tabla, subscriberId);
    },
    reconnect: () => {
      channelManager.reconnectAll();
    }
  };
};

// ========================================================================================
// HOOKS ESPECIALIZADOS
// ========================================================================================

export const useRealtimeReservas = (onUpdate?: (payload: RealtimePayload) => void) => {
  return useRealtimeSubscription({
    tabla: 'reserva',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate
  });
};

export const useRealtimeCanchas = (onUpdate?: (payload: RealtimePayload) => void) => {
  return useRealtimeSubscription({
    tabla: 'cancha',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate
  });
};

export const useRealtimeClientes = (onUpdate?: (payload: RealtimePayload) => void) => {
  return useRealtimeSubscription({
    tabla: 'cliente',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate
  });
};

// ========================================================================================
// HOOKS PARA COMPATIBILIDAD
// ========================================================================================

export const useDashboardRealtime = (options: UseDashboardRealtimeOptions) => {
  const { onReservaChange, onCanchaChange, onClienteChange, enabled = true } = options;

  const reservaSubscription = useRealtimeReservas(onReservaChange ? () => {
    setTimeout(() => onReservaChange(), 50);
  } : undefined);

  const canchaSubscription = useRealtimeCanchas(onCanchaChange ? () => {
    setTimeout(() => onCanchaChange(), 50);
  } : undefined);

  const clienteSubscription = useRealtimeClientes(onClienteChange ? () => {
    setTimeout(() => onClienteChange(), 50);
  } : undefined);

  const isConnected = enabled && (
    reservaSubscription.isConnected && 
    canchaSubscription.isConnected &&
    clienteSubscription.isConnected
  );

  const errors = [
    reservaSubscription.error, 
    canchaSubscription.error,
    clienteSubscription.error
  ].filter(Boolean);

  return {
    isConnected,
    errors,
    connections: {
      reservas: reservaSubscription.isConnected,
      canchas: canchaSubscription.isConnected,
      clientes: clienteSubscription.isConnected,
    },
    reconnectAttempts: {
      reservas: reservaSubscription.reconnectAttempts,
      canchas: canchaSubscription.reconnectAttempts,
      clientes: clienteSubscription.reconnectAttempts,
    },
    disconnect: () => {
      reservaSubscription.disconnect();
      canchaSubscription.disconnect();
      clienteSubscription.disconnect();
    },
    reconnect: () => {
      reservaSubscription.reconnect();
      canchaSubscription.reconnect();
      clienteSubscription.reconnect();
    }
  };
};

// Aliases para compatibilidad
export const useReservasRealtime = (onDataChange?: () => void) => {
  return useRealtimeReservas(onDataChange ? () => setTimeout(() => onDataChange(), 50) : undefined);
};

export const useCanchasRealtime = (onDataChange?: () => void) => {
  return useRealtimeCanchas(onDataChange ? () => setTimeout(() => onDataChange(), 50) : undefined);
};

export const useClientesRealtime = (onDataChange?: () => void) => {
  return useRealtimeClientes(onDataChange ? () => setTimeout(() => onDataChange(), 50) : undefined);
};

// ========================================================================================
// FUNCIONES GLOBALES
// ========================================================================================

export const disconnectAllRealtime = () => {
  channelManager.disconnectAll();
};

export const reconnectAllRealtime = () => {
  channelManager.reconnectAll();
};

export const useRealtimeStatus = () => {
  const [status, setStatus] = useState(channelManager.getConnectionStatus());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(channelManager.getConnectionStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return status;
};

// Exports principales
export { useRealtimeSubscription };
export default useRealtimeSubscription;