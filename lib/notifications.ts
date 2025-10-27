import toast from 'react-hot-toast';

// Tipos para las notificaciones
export type NotificationType = 'success' | 'error' | 'loading' | 'info' | 'warning';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
  style?: Record<string, unknown>;
}

// Configuración por defecto para las notificaciones
const defaultOptions: NotificationOptions = {
  duration: 4000,
  position: 'top-right',
};

// Clase para manejar las notificaciones del sistema
class NotificationManager {
  private static instance: NotificationManager;
  private connectionToastId: string | null = null;
  private connectionDebounceTimeout: NodeJS.Timeout | null = null;
  private lastConnectionState: boolean | null = null;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Notificación de éxito
  success(message: string, options?: NotificationOptions) {
    return toast.success(message, {
      ...defaultOptions,
      ...options,
      style: {
        background: '#10b981',
        color: '#fff',
        ...options?.style,
      },
    });
  }

  // Notificación de error
  error(message: string, options?: NotificationOptions) {
    return toast.error(message, {
      ...defaultOptions,
      duration: 5000, // Los errores duran más tiempo
      ...options,
      style: {
        background: '#ef4444',
        color: '#fff',
        ...options?.style,
      },
    });
  }

  // Notificación informativa
  info(message: string, options?: NotificationOptions) {
    return toast(message, {
      ...defaultOptions,
      ...options,
      icon: options?.icon || 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        ...options?.style,
      },
    });
  }

  // Notificación de advertencia
  warning(message: string, options?: NotificationOptions) {
    return toast(message, {
      ...defaultOptions,
      ...options,
      icon: options?.icon || '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
        ...options?.style,
      },
    });
  }

  // Notificación de carga
  loading(message: string, options?: NotificationOptions) {
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
    });
  }

  // Actualizar una notificación existente
  update(toastId: string, type: NotificationType, message: string, options?: NotificationOptions) {
    const updateOptions = {
      ...defaultOptions,
      ...options,
    };

    switch (type) {
      case 'success':
        return toast.success(message, { id: toastId, ...updateOptions });
      case 'error':
        return toast.error(message, { id: toastId, ...updateOptions });
      case 'loading':
        return toast.loading(message, { id: toastId, ...updateOptions });
      default:
        return toast(message, { id: toastId, ...updateOptions });
    }
  }

  // Descartar una notificación específica
  dismiss(toastId?: string) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  // Descartar todas las notificaciones
  dismissAll() {
    toast.dismiss();
  }

  // Método especializado para notificaciones de conexión con debounce
  connectionStatus(isConnected: boolean, forceUpdate = false) {
    // Si es el mismo estado que antes y no forzamos, no hacer nada
    if (!forceUpdate && this.lastConnectionState === isConnected) {
      return;
    }

    // Cancelar timeout anterior si existe
    if (this.connectionDebounceTimeout) {
      clearTimeout(this.connectionDebounceTimeout);
      this.connectionDebounceTimeout = null;
    }

    // Descartar toast anterior de conexión si existe
    if (this.connectionToastId) {
      toast.dismiss(this.connectionToastId);
      this.connectionToastId = null;
    }

    // Aplicar debounce solo para cambios rápidos
    const delay = forceUpdate ? 0 : 500; // 500ms de debounce

    this.connectionDebounceTimeout = setTimeout(() => {
      if (isConnected) {
        this.connectionToastId = toast.success(
          'Conectado a actualizaciones en tiempo real',
          {
            icon: '🔗',
            duration: 2000, // Duración más corta
            style: {
              background: '#10b981', // Verde para conexión
              color: '#fff',
              border: '1px solid #059669',
            }
          }
        );
      } else {
        this.connectionToastId = toast.error(
          'Desconectado de actualizaciones en tiempo real',
          {
            icon: '⚠️',
            duration: 3000,
            style: {
              background: '#ef4444', // Rojo para desconexión
              color: '#fff',
              border: '1px solid #dc2626',
            }
          }
        );
      }
      
      this.lastConnectionState = isConnected;
      this.connectionDebounceTimeout = null;
    }, delay);
  }
}

// Instancia singleton del manager
export const notifications = NotificationManager.getInstance();

// Notificaciones específicas para eventos de Realtime
export const realtimeNotifications = {
  // Reservas
  nuevaReserva: (clienteNombre: string, cancha: string, horario: string) => {
    notifications.success(
      `Nueva reserva: ${clienteNombre} - ${cancha} (${horario})`,
      {
        icon: '📅',
        duration: 10000,
      }
    );
  },

  reservaActualizada: (clienteNombre: string, cancha: string, nuevoEstado: string) => {
    notifications.info(
      `Reserva actualizada: ${clienteNombre} - ${cancha} → ${nuevoEstado}`,
      {
        icon: '✏️',
        duration: 10000,
      }
    );
  },

  reservaCancelada: (identificador: string) => {
    // Si el identificador empieza con "Reserva #", mostrar formato "Reserva #ID cancelada"
    const mensaje = identificador.startsWith('Reserva #') 
      ? `${identificador} cancelada`
      : `Reserva cancelada: ${identificador}`;
      
    notifications.warning(
      mensaje,
      {
        icon: '❌',
        duration: 10000,
      }
    );
  },

  // Canchas
  nuevaCancha: (nombreCancha: string) => {
    notifications.success(
      `Nueva cancha agregada: ${nombreCancha}`,
      {
        icon: '🏟️',
        duration: 10000,
      }
    );
  },

  canchaActualizada: (nombreCancha: string, cambio: string) => {
    notifications.info(
      `Cancha actualizada: ${nombreCancha} - ${cambio}`,
      {
        icon: '🔧',
        duration: 10000,
      }
    );
  },

  canchaEliminada: (nombreCancha: string) => {
    notifications.warning(
      `Cancha eliminada: ${nombreCancha}`,
      {
        icon: '🗑️',
        duration: 10000,
      }
    );
  },

  // Clientes
  nuevoCliente: (nombreCliente: string) => {
    notifications.success(
      `Nuevo cliente registrado: ${nombreCliente}`,
      {
        icon: '👤',
        duration: 10000,
      }
    );
  },

  clienteActualizado: (nombreCliente: string) => {
    notifications.info(
      `Cliente actualizado: ${nombreCliente}`,
      {
        icon: '✏️',
        duration: 10000,
      }
    );
  },

  clienteEliminado: (nombreCliente: string) => {
    notifications.warning(
      `Cliente eliminado: ${nombreCliente}`,
      {
        icon: '🗑️',
        duration: 10000,
      }
    );
  },

  // Conexión Realtime - Usando sistema con debounce
  conectado: () => {
    notifications.connectionStatus(true);
  },

  desconectado: () => {
    notifications.connectionStatus(false);
  },

  reconectado: () => {
    notifications.connectionStatus(true, true); // Forzar actualización para reconexiones
  },
};

// Configuración del Toaster para usar en el layout
export const toasterConfig = {
  position: 'top-right' as const,
  reverseOrder: false,
  gutter: 8,
  containerClassName: '',
  containerStyle: {},
  toastOptions: {
    // Configuración global
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
      fontSize: '14px',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    // Configuración por tipo
    success: {
      duration: 4000,
    },
    error: {
      duration: 5000,
    },
  },
};

export default notifications;