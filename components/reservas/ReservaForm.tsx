'use client';

import { useState, useEffect } from 'react';
import { Reserva, Cliente, Cancha } from '@/types';
import { CalendarIcon, ClockIcon, MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { obtenerReservasPorFechaYCancha } from '@/app/api/reservas/actions';
import { crearCliente } from '@/app/api/clientes/actions';

interface ReservaFormProps {
  reserva?: Reserva;
  clientes: Cliente[];
  canchas: Cancha[];
  onSubmit: (data: Omit<Reserva, 'id_reserva'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  onClienteCreado?: (cliente: Cliente) => void;
}

export default function ReservaForm({
  reserva,
  clientes,
  canchas,
  onSubmit,
  onCancel,
  isSubmitting,
  onClienteCreado
}: ReservaFormProps) {

  const [clienteId, setClienteId] = useState<number>(reserva?.id_cliente || 0);
  const [canchaId, setCanchaId] = useState<number>(reserva?.id_cancha || 0);
  
  const [busquedaCliente, setBusquedaCliente] = useState<string>('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [mostrarCrearCliente, setMostrarCrearCliente] = useState<boolean>(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    telefono: ''
  });
  const [creandoCliente, setCreandoCliente] = useState<boolean>(false);
  
  const esCanchaDisponible = (cancha: Cancha) => {
    const estadoReal = cancha.estado?.toLowerCase();
    const estadoCompatibilidad = cancha.estado_cancha?.toLowerCase();
    
    const estadosNoDisponibles = [
      'no disponible', 
      'en mantenimiento', 
      'mantenimiento',
      'fuera de servicio',
      'inactiva',
      'inactivo',
      'cerrada',
      'cerrado'
    ];
    
    if ((estadoReal && estadosNoDisponibles.includes(estadoReal)) || 
        (estadoCompatibilidad && estadosNoDisponibles.includes(estadoCompatibilidad))) {
      return false;
    }
    
    if (!estadoReal && !estadoCompatibilidad) return true;
    return (
      estadoReal === 'disponible' || estadoReal === 'activa' || estadoReal === 'activo' ||
      estadoCompatibilidad === 'disponible' || estadoCompatibilidad === 'activa' || estadoCompatibilidad === 'activo'
    );
  };
  
  useEffect(() => {
    if (!busquedaCliente.trim()) {
      setClientesFiltrados(clientes.slice(0, 10));
    } else {
      const filtrados = clientes.filter(cliente => {
        const nombre = `${cliente.nombre} ${cliente.apellido}`.toLowerCase();
        const telefono = cliente.telefono?.toLowerCase() || '';
        const busqueda = busquedaCliente.toLowerCase();
        
        return nombre.includes(busqueda) || 
               telefono.includes(busqueda);
      });
      setClientesFiltrados(filtrados.slice(0, 10));
    }
  }, [busquedaCliente, clientes]);

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.apellido.trim()) {
      setError('El nombre y apellido son obligatorios');
      return;
    }

    setCreandoCliente(true);
    try {
      const clienteCreado = await crearCliente({
        nombre: nuevoCliente.nombre.trim(),
        apellido: nuevoCliente.apellido.trim(),
        telefono: nuevoCliente.telefono.trim()
      });

      // El clienteCreado ya es el objeto cliente completo de la BD
      // Notificar al componente padre para actualizar la lista
      if (onClienteCreado && clienteCreado) {
        onClienteCreado(clienteCreado);
      }
      
      // Actualizar el estado para incluir el nuevo cliente - usar solo el ID
      if (clienteCreado) {
        setClienteId(clienteCreado.id_cliente);
      }
      setBusquedaCliente(`${nuevoCliente.nombre} ${nuevoCliente.apellido}`);
      
      // Limpiar el formulario de nuevo cliente
      setNuevoCliente({ nombre: '', apellido: '', telefono: '' });
      setMostrarCrearCliente(false);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear el cliente');
    } finally {
      setCreandoCliente(false);
    }
  };

  useEffect(() => {
  }, [canchas]);
  
  const obtenerFechaLocal = () => {
    const hoy = new Date();
    const fechaArgentina = new Date(hoy.getTime() - (3 * 60 * 60 * 1000));
    return fechaArgentina.getFullYear() + '-' + 
           String(fechaArgentina.getMonth() + 1).padStart(2, '0') + '-' + 
           String(fechaArgentina.getDate()).padStart(2, '0');
  };
  
  const [fecha, setFecha] = useState<string>(reserva?.fecha_reserva || reserva?.fecha || obtenerFechaLocal());
  const [horaInicio, setHoraInicio] = useState<string>(reserva?.hora_inicio || '');
  const [horaFin, setHoraFin] = useState<string>(reserva?.hora_fin || '');
  
  const generarHorarios = () => {
    const horarios = [];
    for (let i = 8; i <= 23; i++) {
      const hora = i.toString().padStart(2, '0') + ':00';
      horarios.push(hora);
    }
    return horarios;
  };

  // Generar horarios de fin (incluye 00:00 del día siguiente para cualquier hora de inicio)
  const generarHorariosFin = (horaInicioSeleccionada: string) => {
    const horarios = [];
    // Agregar horarios normales después de la hora de inicio
    for (let i = 8; i <= 23; i++) {
      const hora = i.toString().padStart(2, '0') + ':00';
      if (hora > horaInicioSeleccionada) {
        horarios.push(hora);
      }
    }
    horarios.push('00:00');
    return horarios;
  };
  

  const [estadoReserva, setEstadoReserva] = useState<string>(
    reserva?.estado_reserva || 'pendiente'
  );
  const [error, setError] = useState<string>('');
  const [horarioDisponible, setHorarioDisponible] = useState<string>('');
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  
  useEffect(() => {
    if (canchaId) {
      const canchaSeleccionada = canchas.find(c => c.id_cancha === canchaId);
      if (canchaSeleccionada) {
        // Buscar disponibilidad_horaria con nombres flexibles
        setHorarioDisponible(canchaSeleccionada.disponibilidad_horaria || '');
      }
    }
  }, [canchaId, canchas]);

  useEffect(() => {
    const cargarReservasExistentes = async () => {
      if (fecha && canchaId) {
        try {
          const reservas = await obtenerReservasPorFechaYCancha(fecha, canchaId);
          
          // Generar lista de horarios ocupados (ya filtradas por la consulta)
          const ocupados = reservas.map(reserva => `${reserva.hora_inicio}-${reserva.hora_fin}`);
          setHorariosOcupados(ocupados);
          


        } catch (error) {
          console.error('Error al cargar reservas existentes:', error);
        }
      }
    };
    
    cargarReservasExistentes();
  }, [fecha, canchaId]);
  
  // Auto-completar la hora de fin (1 hora después del inicio, siempre horas completas)
  useEffect(() => {
    if (horaInicio) {
      const [hora] = horaInicio.split(':').map(Number);
      const horaFin = hora + 1;
      
      // Si la hora de fin pasa de 23, ponerla a 00 del día siguiente (medianoche)
      const horaFinFormateada = horaFin > 23 ? '00:00' : `${horaFin.toString().padStart(2, '0')}:00`;
      setHoraFin(horaFinFormateada);
    }
  }, [horaInicio]);
  
  // Validación del formulario
  const validarFormulario = (): boolean => {
    // Validar que se hayan seleccionado cliente y cancha
    if (!clienteId) {
      setError('Debe seleccionar un cliente');
      return false;
    }
    
    if (!canchaId) {
      setError('Debe seleccionar una cancha');
      return false;
    }
    
    // Verificar que la cancha seleccionada esté disponible
    const canchaSeleccionada = canchas.find(c => c.id_cancha === canchaId);
    if (canchaSeleccionada && !esCanchaDisponible(canchaSeleccionada)) {
      setError('La cancha seleccionada no está disponible. Por favor, seleccione otra cancha.');
      return false;
    }
    
    // Validar fecha
    if (!fecha) {
      setError('Debe seleccionar una fecha para la reserva');
      return false;
    }
    
    // Validar que la fecha no sea en el pasado
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaSeleccionada = new Date(año, mes - 1, dia); // mes es 0-indexado
    const hoy = new Date();
    
    // Comparar solo las fechas, no las horas
    const fechaSeleccionadaSolo = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate());
    const hoySolo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    

    
    if (fechaSeleccionadaSolo < hoySolo) {
      setError('No puede realizar reservas en fechas pasadas');
      return false;
    }
    
    // Validar horas
    if (!horaInicio || !horaFin) {
      setError('Debe especificar hora de inicio y fin');
      return false;
    }
    
    // Validar que hora de fin sea posterior a hora de inicio (permitir 00:00 como hora de cierre para cualquier horario)
    if (horaFin === '00:00') {
      // Caso especial: cualquier reserva puede terminar a las 00:00 (cierre del complejo)
      // Esto permite reservas como 22:00-00:00, 21:00-00:00, etc.
      // Esto es válido siempre que la hora de inicio sea antes de medianoche
    } else if (horaFin <= horaInicio) {
      setError('La hora de finalización debe ser posterior a la hora de inicio');
      return false;
    }
    
    // Si hay horario disponible, validar que esté dentro del rango permitido
    if (horarioDisponible) {
      const [horaApertura, horaCierre] = horarioDisponible.split('-');
      
      // Convertir las horas a minutos para comparación correcta
      const convertirAMinutos = (hora: string) => {
        const [h, m] = hora.split(':').map(Number);
        return h * 60 + m;
      };
      
      const minInicioReserva = convertirAMinutos(horaInicio);
      const minFinReserva = convertirAMinutos(horaFin);
      const minApertura = convertirAMinutos(horaApertura);
      let minCierre = convertirAMinutos(horaCierre);
      
      // Si la hora de cierre es 00:00, significa medianoche del día siguiente
      if (minCierre === 0) {
        minCierre = 24 * 60; // 1440 minutos (medianoche del día siguiente)
      }
      
      // Validar que la reserva esté dentro del horario
      let esValido = true;
      

      
      if (minCierre > minApertura) {
        // Horario normal (ej: 08:00-22:00)
        esValido = minInicioReserva >= minApertura && minFinReserva <= minCierre;
      } else {
        // Horario que cruza medianoche (ej: 08:00-00:00)
        esValido = (minInicioReserva >= minApertura) && (minFinReserva <= minCierre || minFinReserva <= 1440);
      }
      

      
      if (!esValido) {
        setError(`El horario seleccionado está fuera del horario disponible (${horarioDisponible})`);
        return false;
      }
    }
    
    return true;
  };
  
  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validarFormulario()) return;
    
    try {
      // Calcular el costo de la reserva
      const canchaSeleccionada = canchas.find(c => c.id_cancha === canchaId);
      let costoReserva = 0;
      
      if (canchaSeleccionada) {
        try {
          let diferenciaHoras: number;
          
          if (horaFin === '00:00') {
            // Reservas que terminan a medianoche
            const inicioHora = parseInt(horaInicio.split(':')[0]);
            diferenciaHoras = 24 - inicioHora;
          } else {
            const inicio = new Date(`1970-01-01T${horaInicio}:00`);
            const fin = new Date(`1970-01-01T${horaFin}:00`);
            const diferenciaMs = fin.getTime() - inicio.getTime();
            diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
          }
          
          costoReserva = Math.round(diferenciaHoras * canchaSeleccionada.tarifa_hora * 100) / 100;
        } catch (error) {
          console.error('Error calculando costo:', error);
          costoReserva = 0;
        }
      }

      await onSubmit({
        id_cliente: clienteId,
        id_cancha: canchaId,
        fecha_reserva: fecha,     // Campo real: fecha_reserva
        hora_inicio: horaInicio,  // Campo real: hora_inicio
        hora_fin: horaFin,        // Campo real: hora_fin
        estado_reserva: estadoReserva, // Campo real: estado_reserva
        costo_reserva: costoReserva // Campo real: costo_reserva
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ha ocurrido un error al procesar la reserva');
      }
    }
  };
  
  // Formato para la fecha mínima (hoy en hora Argentina)
  const fechaMinima = obtenerFechaLocal();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">
        {reserva ? 'Editar Reserva' : 'Nueva Reserva'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selección de Cliente Mejorada */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            
            {/* Campo de búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 pr-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                placeholder="Buscar cliente por nombre, apellido o teléfono..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setMostrarCrearCliente(true)}
                  className="text-blue-600 hover:text-blue-700"
                  title="Crear nuevo cliente"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Lista de clientes filtrados */}
            {busquedaCliente && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-sm">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id_cliente}
                      type="button"
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center ${
                        clienteId === cliente.id_cliente ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => {
                        setClienteId(cliente.id_cliente);
                        setBusquedaCliente(`${cliente.nombre} ${cliente.apellido}`);
                      }}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cliente.telefono && `Tel: ${cliente.telefono}`}
                        </div>
                      </div>
                      {clienteId === cliente.id_cliente && (
                        <div className="text-blue-600 text-sm font-medium">Seleccionado</div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No se encontraron clientes
                    <button
                      type="button"
                      onClick={() => setMostrarCrearCliente(true)}
                      className="ml-2 text-blue-600 hover:text-blue-700 underline"
                    >
                      Crear nuevo cliente
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Cliente seleccionado */}
            {clienteId > 0 && !busquedaCliente && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-medium text-green-800">
                  Cliente seleccionado: {clientes.find(c => c.id_cliente === clienteId)?.nombre} {clientes.find(c => c.id_cliente === clienteId)?.apellido}
                </div>
              </div>
            )}
          </div>

          {/* Modal para crear nuevo cliente */}
          {mostrarCrearCliente && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Nuevo Cliente</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCrearCliente(false);
                      setNuevoCliente({ nombre: '', apellido: '', telefono: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      value={nuevoCliente.nombre}
                      onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apellido *</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      value={nuevoCliente.apellido}
                      onChange={(e) => setNuevoCliente({...nuevoCliente, apellido: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                      value={nuevoCliente.telefono}
                      onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCrearCliente(false);
                      setNuevoCliente({ nombre: '', apellido: '', telefono: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={creandoCliente}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCrearCliente}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    disabled={creandoCliente || !nuevoCliente.nombre.trim() || !nuevoCliente.apellido.trim()}
                  >
                    {creandoCliente ? 'Creando...' : 'Crear Cliente'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Selección de Cancha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancha
            </label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              value={canchaId || 0}
              onChange={(e) => setCanchaId(Number(e.target.value))}
              disabled={isSubmitting}
              required
            >
              <option value={0}>Seleccione una cancha</option>
              {Array.isArray(canchas) && canchas.length > 0 ? (
                // Filtrar solo canchas disponibles
                canchas.filter(esCanchaDisponible).map((cancha) => (
                  <option key={cancha.id_cancha} value={cancha.id_cancha}>
                    {cancha.nombre || `Cancha ${cancha.id_cancha}`} - Tipo: {cancha.tipo || 'N/A'} jugadores - ${cancha.tarifa_hora}/hora
                  </option>
                ))
              ) : (
                <option disabled>
                  {Array.isArray(canchas) && canchas.length > 0 
                    ? "Todas las canchas están en mantenimiento o no disponibles" 
                    : "No hay canchas registradas"}
                </option>
              )}
            </select>
            {horarioDisponible && (
              <p className="text-sm text-gray-500 mt-1">
                Horario disponible: {horarioDisponible}
              </p>
            )}
          </div>
          
          {/* Fecha de reserva */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="date"
                className="pl-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={fechaMinima}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          
          {/* Horario (Inicio y Fin) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Inicio
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="pl-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Seleccione hora</option>
                  {generarHorarios().map((hora) => {
                    // Verificar si esta hora específica está ocupada por alguna reserva existente
                    const estaOcupado = horariosOcupados.some(horario => {
                      const [inicioOcupado, finOcupado] = horario.split('-');
                      
                      // Normalizar formato de horas (remover segundos)
                      const normalizarHora = (h: string) => {
                        if (h && h.includes(':')) {
                          const partes = h.split(':');
                          return `${partes[0]}:${partes[1]}`;
                        }
                        return h;
                      };
                      
                      const inicioOcupadoNorm = normalizarHora(inicioOcupado);
                      const finOcupadoNorm = normalizarHora(finOcupado);
                      
                      // Convertir horas a números para comparación correcta
                      const horaActual = parseInt(hora.split(':')[0]);
                      const horaInicioOcupado = parseInt(inicioOcupadoNorm.split(':')[0]);
                      let horaFinOcupado = parseInt(finOcupadoNorm.split(':')[0]);
                      
                      // Si hora fin es 00:00, convertir a 24 para comparación
                      if (horaFinOcupado === 0) {
                        horaFinOcupado = 24;
                      }
                      
                      // Esta hora está ocupada si cae dentro del rango de la reserva
                      const ocupada = horaActual >= horaInicioOcupado && horaActual < horaFinOcupado;
                      
                      return ocupada;
                    });
                    
                    return (
                      <option 
                        key={hora} 
                        value={hora} 
                        disabled={estaOcupado}
                        className={estaOcupado ? 'text-red-500 bg-red-50' : ''}
                      >
                        {hora} {estaOcupado ? '(Ocupado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Fin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="pl-10 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  disabled={isSubmitting || !horaInicio}
                  required
                >
                  <option value="">Seleccione hora fin</option>
                  {horaInicio && generarHorariosFin(horaInicio).map((hora) => (
                    <option key={hora} value={hora}>
                      {hora} {hora === '00:00' ? '(día siguiente)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Estado de la reserva */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              value={estadoReserva}
              onChange={(e) => setEstadoReserva(e.target.value as 'pendiente' | 'confirmada' | 'cancelada' | 'completada')}
              disabled={isSubmitting}
              required
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>
        
        {/* Costo estimado */}
        {canchaId && horaInicio && horaFin && (() => {
          const canchaSeleccionada = canchas.find(c => c.id_cancha === canchaId);
          if (!canchaSeleccionada) return null;
          
          const calcularCosto = () => {
            try {
              let diferenciaHoras: number;
              
              if (horaFin === '00:00') {
                // Reservas que terminan a medianoche
                const inicioHora = parseInt(horaInicio.split(':')[0]);
                diferenciaHoras = 24 - inicioHora;
              } else {
                const inicio = new Date(`1970-01-01T${horaInicio}:00`);
                const fin = new Date(`1970-01-01T${horaFin}:00`);
                const diferenciaMs = fin.getTime() - inicio.getTime();
                diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
              }
              
              return Math.round(diferenciaHoras * canchaSeleccionada.tarifa_hora * 100) / 100;
            } catch {
              return 0;
            }
          };

          const costoEstimado = calcularCosto();
          const duracion = horaFin === '00:00' ? 
            (24 - parseInt(horaInicio.split(':')[0])) :
            (horaFin > horaInicio ? 
              ((new Date(`1970-01-01T${horaFin}:00`).getTime() - new Date(`1970-01-01T${horaInicio}:00`).getTime()) / (1000 * 60 * 60)) : 0);

          if (costoEstimado > 0) {
            return (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Resumen del Costo</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Cancha: {canchaSeleccionada.nombre}</span>
                    <span>${canchaSeleccionada.tarifa_hora}/hora</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duración: {duracion} hora{duracion !== 1 ? 's' : ''}</span>
                    <span>{duracion} × ${canchaSeleccionada.tarifa_hora}</span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-blue-200">
                    <span>Total:</span>
                    <span>${costoEstimado.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Botones de acción */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {reserva ? 'Actualizando...' : 'Creando...'}
              </span>
            ) : reserva ? 'Actualizar Reserva' : 'Crear Reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}