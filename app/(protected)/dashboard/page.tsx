'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import StatCard from '@/components/StatCard';
import CourtOccupancyChart from '@/components/charts/CourtOccupancyChart';
import HourlyUsageChart from '@/components/charts/HourlyUsageChart';

import WeeklyBookingsChart from '@/components/charts/WeeklyBookingsChart';
import {
  obtenerEstadisticasDashboard,
  obtenerReservasPorHorario,
  obtenerReservasPorDiaSemana,

  obtenerHorariosDisponibles,

} from '@/app/api/reservas/actions';
import type { 
  DashboardStats, 
  ReservaPorHorario, 
  ReservaPorDia, 
 
  HorarioDisponible,

} from '@/types/dashboard';

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

  // Effect para actualizar fecha y hora actual (solo en cliente)
  useEffect(() => {
    const actualizarFechaHora = () => {
      const ahora = new Date();
      setFechaActual(ahora.toLocaleDateString('es-AR'));
      setHoraActual(ahora.toLocaleTimeString('es-AR'));
      

    };

    // Actualizar inmediatamente
    actualizarFechaHora();
    
    // Actualizar cada segundo
    const intervalo = setInterval(actualizarFechaHora, 1000);
    
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [
          estadisticas,
          datosPorHorario,
          datosPorDia,
          horariosData
        ] = await Promise.all([
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
        // Error silencioso en producción
      }
    };

    cargarDatos();
  }, []);



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
            <div key={cancha.id_cancha} className={`border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
              cancha.canchaEnMantenimiento 
                ? 'border-orange-300 bg-orange-50' 
                : cancha.horariosDisponibles.length > 0 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-red-300 bg-red-50'
            }`}>
              
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

                  {/* Horarios Pasados */}
                  {cancha.horariosPasados && cancha.horariosPasados.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Ya pasaron ({cancha.horariosPasados.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cancha.horariosPasados.map((horario, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md border border-gray-200" title="Horario ya pasado">
                            {horario}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
              <span className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></span>
              <span>Horario ya pasado</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
              <span>Cancha en mantenimiento</span>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}