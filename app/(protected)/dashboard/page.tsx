'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarIcon, ClockIcon, UserGroupIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useDashboardRealtime } from '@/lib/useRealtime';
import { notifications } from '@/lib/notifications';
import {
  obtenerEstadisticasDashboard,
  obtenerReservasPorHorario,
  obtenerReservasPorDiaSemana,
  obtenerHorariosDisponibles,
} from '@/app/api/reservas/actions';
import StatCard from '@/components/StatCard';
import CourtOccupancyChart from '@/components/charts/CourtOccupancyChart';
import HourlyUsageChart from '@/components/charts/HourlyUsageChart';
import WeeklyBookingsChart from '@/components/charts/WeeklyBookingsChart';

import type { DashboardStats, ReservaPorHorario, ReservaPorDia, HorarioDisponible } from '@/types/dashboard';

export default function DashboardPage() {
  const [statsData, setStatsData] = useState<DashboardStats>({
    reservasConfirmadas: 0,
    reservasPendientes: 0,
    ingresosDiarios: 0,
    ingresosMensuales: 0,
    canchasDisponibles: 0,
    totalCanchas: 0,
    totalReservasMensuales: 0,
    clientesActivos: 0
  });
  
  const [reservasPorHorario, setReservasPorHorario] = useState<ReservaPorHorario[]>([]);
  const [reservasPorDia, setReservasPorDia] = useState<ReservaPorDia[]>([]);

  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioDisponible[]>([]);
  const [fechaActual, setFechaActual] = useState<string>('');
  const [horaActual, setHoraActual] = useState<string>('');
  
  // Estados del modal de disponibilidad
  const [modalAbierto, setModalAbierto] = useState(false);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<HorarioDisponible | null>(null);
  const [reservasSemana, setReservasSemana] = useState<{
    fecha: string;
    horariosDisponibles: string[];
    horariosOcupados: string[];
  }[]>([]);

  // Consulta reservas de una cancha en fecha específica
  const getReservasPorFecha = async (canchaId: number, fecha: string) => {
    try {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('reserva')
        .select('hora_inicio, hora_fin, estado_reserva')
        .eq('fecha_reserva', fecha)
        .eq('id_cancha', canchaId)
        .in('estado_reserva', ['confirmada', 'pendiente']);

      return error ? [] : data || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const actualizarFechaHora = () => {
      const ahora = new Date();
      setFechaActual(ahora.toLocaleDateString('es-AR'));
      setHoraActual(ahora.toLocaleTimeString('es-AR'));
    };

    actualizarFechaHora();
    const intervalo = setInterval(actualizarFechaHora, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const [estadisticas, datosPorHorario, datosPorDia, horariosData] = await Promise.all([
        obtenerEstadisticasDashboard(),
        obtenerReservasPorHorario(),
        obtenerReservasPorDiaSemana(),
        obtenerHorariosDisponibles()
      ]);

      setStatsData(estadisticas);
      setReservasPorHorario(datosPorHorario);
      setReservasPorDia(datosPorDia);
      setHorariosDisponibles(horariosData);
    } catch {
      notifications.error('Error al cargar los datos del dashboard');
    }
  }, []);

  const onReservaChange = useCallback(() => {
    setTimeout(cargarDatos, 100);
  }, [cargarDatos]);

  const onCanchaChange = useCallback(() => {
    setTimeout(cargarDatos, 100);
  }, [cargarDatos]);

  // Configurar suscripciones de Realtime
  useDashboardRealtime({
    onReservaChange,
    onCanchaChange,
    onPagoChange: () => {
      // Las notificaciones de pagos se manejan automáticamente a través del sistema de realtime
      // No necesitamos recargar datos aquí, solo queremos las notificaciones
    },
    enabled: true
  });

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Función para calcular rango de 7 días desde hoy
  const calcular7Dias = () => {
    const fechas = [];
    const hoy = new Date();
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;
      
      fechas.push(fechaStr);
    }
    
    return fechas;
  };

  // Maneja click en tarjetas de cancha para abrir modal
  const manejarClickCancha = async (cancha: HorarioDisponible) => {
    setCanchaSeleccionada(cancha);
    
    try {
      const fechas7Dias = calcular7Dias();
      const reservasPorDia = [];
      
      for (const fecha of fechas7Dias) {
        const reservasDelDia = await getReservasPorFecha(cancha.id_cancha, fecha);
        
        // Generar horarios base (08:00 a 23:00)
        const horariosBase = [];
        for (let h = 8; h <= 23; h++) {
          horariosBase.push(`${h.toString().padStart(2, '0')}:00`);
        }
        
        // Calcular horarios ocupados incluyendo rangos completos
        const horariosOcupados: string[] = [];
        
        reservasDelDia.forEach(reserva => {
          const horaInicio = reserva.hora_inicio.substring(0, 5);
          const horaFin = reserva.hora_fin.substring(0, 5);
          const horaInicioNum = parseInt(horaInicio.split(':')[0]);
          let horaFinNum = parseInt(horaFin.split(':')[0]);
          
          // Manejar el caso especial de reservas que terminan a medianoche (00:00)
          if (horaFin === '00:00') {
            horaFinNum = 24; // Tratar 00:00 como 24:00 para el cálculo
          }
          
          // Marcar todas las horas del rango de la reserva
          for (let h = horaInicioNum; h < horaFinNum; h++) {
            const horarioOcupado = `${h.toString().padStart(2, '0')}:00`;
            if (!horariosOcupados.includes(horarioOcupado)) {
              horariosOcupados.push(horarioOcupado);
            }
          }
        });
        
        const horariosDisponibles = horariosBase.filter(
          horario => !horariosOcupados.includes(horario)
        );
        
        reservasPorDia.push({
          fecha,
          horariosDisponibles,
          horariosOcupados
        });
      }
      
      setReservasSemana(reservasPorDia);
      setModalAbierto(true);
      
    } catch {
      notifications.error('Error al cargar la disponibilidad de la cancha');
    }
  };

  return (
    <div className="p-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard 
          title="Reservas Confirmadas"
          value={statsData.reservasConfirmadas}
          description="Del día de hoy"
          icon={<CalendarIcon className="h-6 w-6" />}
        />
        
        <StatCard 
          title="Reservas Pendientes"
          value={statsData.reservasPendientes}
          description="Del día de hoy"
          icon={<ClockIcon className="h-6 w-6" />}
        />
        
        <StatCard 
          title="Clientes Activos"
          value={statsData.clientesActivos}
          description="Con reservas este mes"
          icon={<UserGroupIcon className="h-6 w-6" />}
        />
        
        <StatCard 
          title="Disponibilidad"
          value={`${statsData.canchasDisponibles}/${statsData.totalCanchas}`}
          description="Canchas disponibles"
          icon={<ClockIcon className="h-6 w-6" />}
        />
        
        <StatCard 
          title="Ingresos Diarios"
          value={`$${statsData.ingresosDiarios.toLocaleString()}`}
          description="Ingresos estimados hoy"
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
        />
      </div>
      
      {/* Gráficos principales - Layout mejorado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <HourlyUsageChart data={reservasPorHorario} />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <WeeklyBookingsChart data={reservasPorDia} />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <CourtOccupancyChart 
            occupied={statsData.totalCanchas - statsData.canchasDisponibles} 
            available={statsData.canchasDisponibles} 
          />
        </div>
      </div>
      


      {/* Disponibilidad Completa de Horarios - TODAS LAS CANCHAS */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Estado de Canchas - [{fechaActual || 'Cargando...'}]</h3>
          <div className="text-sm text-gray-500">
            Actualización en tiempo real • {horaActual || 'Cargando...'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {horariosDisponibles.map((cancha) => (
            <div 
              key={cancha.id_cancha} 
              onClick={() => manejarClickCancha(cancha)}
              className={`border-2 rounded-lg p-4 transition-all hover:shadow-lg cursor-pointer ${
                cancha.canchaEnMantenimiento 
                  ? 'border-orange-300 bg-orange-50 hover:bg-orange-100' 
                  : cancha.horariosDisponibles.length > 0 
                    ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                    : 'border-red-300 bg-red-50 hover:bg-red-100'
              }`}
              title="Click para ver reservas de los próximos 7 días"
            >
              
              {/* Header de la cancha */}
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-lg text-gray-900">{cancha.nombre}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cancha.canchaEnMantenimiento 
                    ? 'bg-orange-200 text-orange-800' 
                    : 'bg-green-200 text-green-800'
                }`}>
                  {cancha.estadoCancha}
                </div>
              </div>
              
              {/* Info básica */}
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <div><span className="font-medium">Tipo:</span> {cancha.tipo} jugadores</div>
                <div><span className="font-medium">Tarifa:</span> ${cancha.tarifa_hora}/hora</div>
                <div><span className="font-medium">Horario:</span> {cancha.disponibilidad_horaria}</div>
              </div>
              
              {cancha.canchaEnMantenimiento ? (
                /* Cancha en mantenimiento */
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🔧</div>
                  <div className="text-sm font-medium text-orange-700 mb-1">Cancha en Mantenimiento</div>
                  <div className="text-xs text-orange-600">No disponible para reservas hoy</div>
                </div>
              ) : (
                <>
                  {/* Horarios Disponibles */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700">
                        Disponibles ({cancha.horariosDisponibles.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-[24px]">
                      {cancha.horariosDisponibles.length > 0 ? (
                        cancha.horariosDisponibles.map((horario, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium border border-green-200 hover:bg-green-200 transition-colors cursor-pointer" title="Disponible para reservar">
                            {horario}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 italic py-1">Todos los horarios ocupados o pasados</span>
                      )}
                    </div>
                  </div>

                  {/* Horarios Ocupados */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-700">
                        Reservados ({cancha.horariosOcupados.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-[24px]">
                      {cancha.horariosOcupados.length > 0 ? (
                        cancha.horariosOcupados.map((horario, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md border border-red-200" title="Ocupado por reserva">
                            {horario}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-green-600 font-medium py-1">Sin reservas hoy</span>
                      )}
                    </div>
                  </div>


                </>
              )}
              
              {/* Resumen final */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-green-100 rounded p-1">
                    <div className="font-bold text-green-800">{cancha.horariosDisponibles?.length || 0}</div>
                    <div className="text-green-600">Libres</div>
                  </div>
                  <div className="bg-red-100 rounded p-1">
                    <div className="font-bold text-red-800">{cancha.horariosOcupados?.length || 0}</div>
                    <div className="text-red-600">Ocupados</div>
                  </div>
                  <div className="bg-gray-100 rounded p-1">
                    <div className="font-bold text-gray-700">{cancha.totalHorariosHoy || 16}</div>
                    <div className="text-gray-600">Total</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {horariosDisponibles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🏟️</div>
            <div className="text-lg font-semibold mb-2">No hay canchas configuradas</div>
            <div className="text-sm">Agrega canchas al sistema para ver su disponibilidad</div>
          </div>
        )}
        
        {/* Leyenda */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2 font-medium">Leyenda:</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
              <span>Disponible para reservar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
              <span>Ocupado por reserva</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
              <span>Cancha en mantenimiento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Vista Semanal */}
      {modalAbierto && canchaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {canchaSeleccionada.nombre} - Reservas de los próximos 7 días
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Tipo: {canchaSeleccionada.tipo} • Tarifa: ${canchaSeleccionada.tarifa_hora.toLocaleString()}/hora
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Cerrar"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="grid gap-4">
                {reservasSemana.map((dia, index) => {
                  // Crear fecha correctamente desde string YYYY-MM-DD
                  const [year, month, day] = dia.fecha.split('-').map(Number);
                  const fecha = new Date(year, month - 1, day); // month es 0-indexed
                  const esHoy = index === 0;
                  const nombreDia = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
                  const fechaFormateada = fecha.toLocaleDateString('es-AR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  });

                  return (
                    <div 
                      key={dia.fecha} 
                      className={`border rounded-lg p-4 ${
                        esHoy ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {nombreDia} - {fechaFormateada}
                          {esHoy && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">HOY</span>}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {dia.horariosDisponibles.length} libres • {dia.horariosOcupados.length} ocupados
                        </div>
                      </div>

                      {/* Grid de horarios */}
                      <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1">
                        {/* Generar todos los horarios del día (8:00 a 23:00) */}
                        {Array.from({ length: 16 }, (_, i) => {
                          const hora = 8 + i;
                          const horarioStr = `${hora.toString().padStart(2, '0')}:00`;
                          const estaDisponible = dia.horariosDisponibles.includes(horarioStr);
                          const estaOcupado = dia.horariosOcupados.includes(horarioStr);
                          
                          return (
                            <div
                              key={horarioStr}
                              className={`text-xs px-2 py-1 rounded text-center font-medium transition-colors ${
                                estaOcupado
                                  ? 'bg-red-500 text-white border-2 border-red-600 shadow-md'
                                  : estaDisponible
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                              title={
                                estaOcupado 
                                  ? `Ocupado - ${horarioStr}` 
                                  : estaDisponible 
                                  ? `Disponible - ${horarioStr}` 
                                  : `No disponible - ${horarioStr}`
                              }
                            >
                              {horarioStr}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leyenda del modal */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2 font-medium">Leyenda:</div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 border-2 border-red-600 rounded"></span>
                    <span className="font-medium">Ocupado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></span>
                    <span>No disponible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
