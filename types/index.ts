
export interface Cancha {
    id_cancha: number;
    nombre: string;
    tipo: string;
    disponibilidad_horaria?: string;
    estado?: string;
    tarifa_hora: number;
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

    costo_total?: number;
    observaciones?: string;
    cliente?: Cliente;
    cancha?: Cancha;
    fecha?: string;
    cliente_id?: number;
    cancha_id?: number;
}

export interface Pago {
    id_pago: number;
    id_reserva: number;
    monto: number;
    estado_pago: 'aprobado' | 'pendiente' | 'cancelado' | 'desconocido';
    mp_id?: string | null;
    fecha_pago: string;
    reserva?: Reserva;
}


export interface DashboardStats {
    totalReservations: number;
    activeReservations: number;
    totalIncome: number;
}