
export interface Cancha {
    id_cancha: number;
    nombre: string;
    tipo: string;
    disponibilidad_horaria?: string;
    estado?: string;
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
    email?: string;
    fecha_registro?: string;
    created_at?: string;
}

export interface Reserva {
    id_reserva: number;
    fecha_reserva: string;
    hora_inicio: string;
    hora_fin: string;
    estado_reserva: string;
    id_cliente: number;
    id_cancha: number;
    costo_reserva: number;
    created_at?: string;
    // Campos adicionales que no existen en la BD pero se usan en la app
    costo_total?: number;
    observaciones?: string;
    cliente?: Cliente;
    cancha?: Cancha;
    // Campos adicionales para retrocompatibilidad
    fecha?: string;
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