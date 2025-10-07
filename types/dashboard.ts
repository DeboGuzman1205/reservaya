export interface DashboardStats {
  reservasConfirmadas: number;
  reservasPendientes: number;
  totalCanchas: number;
  canchasDisponibles: number;
  ingresosDiarios: number;
  ingresosMensuales: number;
  totalReservasMensuales: number;
  clientesActivos: number;
}

export interface ReservaPorHorario {
  hora: string;
  cantidad: number;
}

export interface ReservaPorDia {
  dia: string;
  cantidad: number;
}

export interface CanchaMasReservada {
  nombre: string;
  cantidad: number;
}

export interface IngresoMensual {
  mes: string;
  ingresos: number;
}

export interface HorarioDisponible {
  id_cancha: number;
  nombre: string;
  tipo: string;
  tarifa_hora: number;
  disponibilidad_horaria: string;
  horariosOcupados: string[];
  horariosDisponibles: string[];
  horariosPasados: string[];
  canchaEnMantenimiento: boolean;
  estadoCancha: string;
  totalHorariosHoy: number;
}

export interface ReservaReciente {
  id_reserva: number;
  cliente_nombre: string;
  cancha_nombre: string;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  estado_reserva: string;
  costo_reserva: number;
}