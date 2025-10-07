
export interface Cancha {
    id_cancha: number;
    nombre: string;                    // Nombre real en tu BD
    tipo: string;                      // Tipo real en tu BD (5, 6, 7 u 8 jugadores)
    disponibilidad_horaria?: string;
    estado?: string;                   // Estado real en tu BD
    tarifa_hora: number;
    // Campos adicionales para retrocompatibilidad
    nombre_cancha?: string;
    tipo_cancha?: string;
    estado_cancha?: 'disponible' | 'no disponible' | 'mantenimiento';
    created_at?: string;
}


export interface Cliente {
    id_cliente: number;
    nombre: string;
    apellido: string;
    telefono?: string;
    email?: string;  // Opcional porque no existe en tu BD
    fecha_registro?: string;
    created_at?: string;
}


export interface Reserva {
    id_reserva: number;
    fecha_reserva: string;             // Campo real: fecha_reserva (date)
    hora_inicio: string;               // Campo real: hora_inicio (time)
    hora_fin: string;                  // Campo real: hora_fin (time)
    estado_reserva: string;            // Campo real: estado_reserva (varchar)
    id_cliente: number;                // Campo real: id_cliente (int4)
    id_cancha: number;                 // Campo real: id_cancha (int4)
    costo_reserva: number;             // Campo real: costo_reserva - costo total de la reserva
    created_at?: string;               // Campo real: created_at (timestamp) - fecha y hora de creación (opcional en creación)
    // Campos adicionales que no existen en la BD pero se usan en la app
    costo_total?: number;              // Solo para cálculos, no se guarda (deprecated - usar costo_reserva)
    observaciones?: string;            // Solo para cálculos, no se guarda
    cliente?: Cliente;
    cancha?: Cancha;
    // Campos adicionales para retrocompatibilidad
    fecha?: string;                    // Alias para fecha_reserva
    cliente_id?: number;
    cancha_id?: number;
}


export interface Pago {
    id_pago: number;
    monto: number;
    estado: 'pendiente' | 'completado' | 'cancelado';
    mp_id: string | null;
    fecha_pago: string;
    id_reserva: number;
}

// Interface para las estadísticas del dashboard
export interface DashboardStats {
    totalReservations: number;
    activeReservations: number;
    totalIncome: number;
}