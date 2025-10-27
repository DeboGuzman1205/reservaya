'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { Reserva } from '@/types';

function obtenerFechaLocal(fecha: Date): string {
  return fecha.getFullYear() + '-' + 
         String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
         String(fecha.getDate()).padStart(2, '0');
}

const verificarConectividad = async (supabase: ReturnType<typeof createServerComponentClient>) => {
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session.session) {
      throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
    }
    return true;
  } catch (error) {
    throw error;
  }
};

const validarHoraReserva = (horaInicio: string, horaFin: string) => {
  if (horaFin === '00:00') {
    return true;
  }
  
  const inicio = new Date(`1970-01-01T${horaInicio}:00`);
  const fin = new Date(`1970-01-01T${horaFin}:00`);
  
  if (inicio >= fin) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio');
  }
  const diferenciaMs = fin.getTime() - inicio.getTime();
  const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
  
  if (diferenciaHoras < 1) {
    throw new Error('La reserva debe ser de al menos 1 hora');
  }
  
  return true;
};

// Función para verificar disponibilidad (sin conflictos)
const verificarDisponibilidad = async (
  fecha: string, 
  horaInicio: string, 
  horaFin: string, 
  idCancha: number, 
  idReserva?: number
) => {
  const supabase = createServerComponentClient({ cookies });
  
  // Validar horas
  validarHoraReserva(horaInicio, horaFin);

  let query = supabase
    .from('reserva')
    .select('*');
    
  // Intentar diferentes nombres de columna para cancha
  try {
    query = query.eq('id_cancha', idCancha);
  } catch {
    try {
      query = query.eq('cancha_id', idCancha);
    } catch {
    }
  }

  try {
    query = query.eq('fecha_reserva', fecha);
  } catch {
    // Si no funciona, intentar con 'fecha' como fallback
    try {
      query = query.eq('fecha', fecha);
    } catch {
      // Si no funciona ninguno, continuar sin filtro de fecha
    }
  }
    
  // Filtrar por estados que no sean cancelados
  query = query.neq('estado_reserva', 'cancelada');
  
  // Si estamos actualizando, excluir la reserva actual
  if (idReserva) {
    query = query.neq('id_reserva', idReserva);
  }
  
  const { data: reservasExistentes, error } = await query;
  
  if (error) {
    throw new Error(`Error al verificar disponibilidad: ${error.message}`);
  }

  // Función para normalizar formatos de hora (remover segundos si existen)
  const normalizarHora = (hora: string) => {
    if (hora.includes(':')) {
      const partes = hora.split(':');
      return `${partes[0]}:${partes[1]}`;  // Solo HH:MM
    }
    return hora;
  };

  if (reservasExistentes && reservasExistentes.length > 0) {
    const conflictos = reservasExistentes.filter(reserva => {
      // Convertir horas a minutos desde medianoche para comparación correcta
      const horaAMinutos = (hora: string): number => {
        const [hh, mm] = hora.split(':').map(Number);
        // Si es 00:00, considerarlo como 24:00 (1440 minutos)
        if (hh === 0 && mm === 0) {
          return 24 * 60; // 1440 minutos = medianoche del día siguiente
        }
        return hh * 60 + mm;
      };
      
      const inicioReservaExistente = normalizarHora(reserva.hora_inicio);
      const finReservaExistente = normalizarHora(reserva.hora_fin);
      const inicioNuevaReserva = normalizarHora(horaInicio);
      const finNuevaReserva = normalizarHora(horaFin);
      
      // Convertir a minutos para comparación numérica correcta
      const inicioExistenteMin = horaAMinutos(inicioReservaExistente);
      const finExistenteMin = horaAMinutos(finReservaExistente);
      const inicioNuevoMin = horaAMinutos(inicioNuevaReserva);
      const finNuevoMin = horaAMinutos(finNuevaReserva);

      // Dos intervalos se solapan si: max(inicio1, inicio2) < min(fin1, fin2)
      const inicioSolapamiento = Math.max(inicioNuevoMin, inicioExistenteMin);
      const finSolapamiento = Math.min(finNuevoMin, finExistenteMin);
      const hayConflicto = inicioSolapamiento < finSolapamiento;

      return hayConflicto;
    });
    
    if (conflictos.length > 0) {
      const conflictoDetalle = conflictos.map(c => 
        `${normalizarHora(c.hora_inicio)}-${normalizarHora(c.hora_fin)}`
      ).join(', ');
      
      throw new Error(`Conflicto de horarios: Ya existe una reserva en ${conflictoDetalle}. El horario ${normalizarHora(horaInicio)}-${normalizarHora(horaFin)} se solapa con esta reserva existente.`);
    }
  }
  
  return true;
};

// Obtener reservas existentes para una cancha en una fecha específica
export async function obtenerReservasPorFechaYCancha(fecha: string, idCancha: number) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    const { data, error } = await supabase
      .from('reserva')
      .select('hora_inicio, hora_fin, estado_reserva')
      .eq('fecha_reserva', fecha)
      .eq('id_cancha', idCancha)
      .in('estado_reserva', ['confirmada', 'pendiente']); // Solo reservas activas
    
    if (error) {
            return [];
    }

    return data || [];
  } catch {
        return [];
  }
}

// Función para calcular el costo total de la reserva (no se guarda en BD)
export const calcularCostoReserva = async (
  idCancha: number, 
  horaInicio: string, 
  horaFin: string
): Promise<number> => {
  const supabase = createServerComponentClient({ cookies });
  
  // Obtener la tarifa de la cancha
  const { data: cancha, error } = await supabase
    .from('cancha')
    .select('tarifa_hora')
    .eq('id_cancha', idCancha)
    .single();
  
  if (error || !cancha) {
        return 0;
  }
  
  // Calcular la duración en horas (manejar reservas que terminan a las 00:00)
  let diferenciaHoras: number;
  
  if (horaFin === '00:00') {
    // Caso especial: reservas que terminan a medianoche (cruzan al día siguiente)
    const inicioHora = parseInt(horaInicio.split(':')[0]);
    diferenciaHoras = 24 - inicioHora; // Ej: 22:00 a 00:00 = 24 - 22 = 2 horas
  } else {
    const inicio = new Date(`1970-01-01T${horaInicio}:00`);
    const fin = new Date(`1970-01-01T${horaFin}:00`);
    const diferenciaMs = fin.getTime() - inicio.getTime();
    diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
  }
  
  // Calcular el costo total
  const costoTotal = Math.round(diferenciaHoras * cancha.tarifa_hora * 100) / 100;
  
  return costoTotal;
};

// Obtener todas las reservas
export async function obtenerReservas() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Verificar conectividad y sesión
    await verificarConectividad(supabase);
    
    // Primero obtener las reservas sin especificar orden para evitar errores de columnas
    const { data: reservas, error } = await supabase
      .from('reserva')
      .select('*');
      
    if (error) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error('La tabla "reserva" no existe en la base de datos. Por favor, crea la estructura de la base de datos.');
      }
      
      throw new Error('Error al cargar las reservas: ' + error.message);
    }
    
    // Ahora intentar obtener datos relacionados manualmente
    const reservasConDatos = await Promise.all((reservas || []).map(async (reserva) => {
      try {
        // Intentar obtener datos del cliente
        const { data: cliente } = await supabase
          .from('cliente')
          .select('*')
          .eq('id_cliente', reserva.id_cliente)
          .single();
          
        // Intentar obtener datos de la cancha
        const { data: cancha } = await supabase
          .from('cancha')
          .select('*')
          .eq('id_cancha', reserva.id_cancha)
          .single();
          
        return {
          ...reserva,
          cliente: cliente || null,
          cancha: cancha || null
        };
      } catch {
        return reserva;
      }
    }));
    

    return reservasConDatos;
    
  } catch (error) {
        throw new Error('Error al cargar las reservas: ' + (error as Error).message);
  }
}

// Crear una nueva reserva
export async function crearReserva(reserva: Omit<Reserva, 'id_reserva'>) {
  const supabase = createServerComponentClient({ cookies });
  

  
  // Verificar disponibilidad usando el nombre correcto de campo
  await verificarDisponibilidad(
    reserva.fecha_reserva || reserva.fecha || '',
    reserva.hora_inicio,
    reserva.hora_fin,
    reserva.id_cancha
  );
  
  // Calcular el costo de la reserva
  const costoReserva = await calcularCostoReserva(
    reserva.id_cancha,
    reserva.hora_inicio,
    reserva.hora_fin
  );
  
  const reservaParaInsertar = {
    fecha_reserva: reserva.fecha_reserva || reserva.fecha,
    hora_inicio: reserva.hora_inicio,
    hora_fin: reserva.hora_fin,
    estado_reserva: reserva.estado_reserva || 'pendiente',
    id_cliente: reserva.id_cliente,
    id_cancha: reserva.id_cancha,
    costo_reserva: costoReserva
  };
  

  
  // Crear la reserva
  const { data, error } = await supabase
    .from('reserva')
    .insert(reservaParaInsertar)
    .select('id_reserva')
    .single();
  
  if (error) {
        throw new Error(`Error al crear la reserva: ${error.message}`);
  }
  
  revalidatePath('/reservas');
  return data.id_reserva;
}

// Actualizar una reserva existente
export async function actualizarReserva(
  id: number, 
  reserva: Omit<Reserva, 'id_reserva'>
) {
  const supabase = createServerComponentClient({ cookies });
  
  // Verificar disponibilidad usando el nombre correcto de campo
  await verificarDisponibilidad(
    reserva.fecha_reserva || reserva.fecha || '',
    reserva.hora_inicio,
    reserva.hora_fin,
    reserva.id_cancha,
    id
  );
  
  // Recalcular el costo si cambió la cancha o las horas
  const costoReserva = await calcularCostoReserva(
    reserva.id_cancha,
    reserva.hora_inicio,
    reserva.hora_fin
  );
  
  const reservaParaActualizar: Partial<{
    fecha_reserva: string;
    hora_inicio: string;
    hora_fin: string;
    estado_reserva: string;
    id_cliente: number;
    id_cancha: number;
    costo_reserva: number;
  }> = {};
  
  if (reserva.fecha_reserva || reserva.fecha) {
    reservaParaActualizar.fecha_reserva = reserva.fecha_reserva || reserva.fecha;
  }
  if (reserva.hora_inicio) reservaParaActualizar.hora_inicio = reserva.hora_inicio;
  if (reserva.hora_fin) reservaParaActualizar.hora_fin = reserva.hora_fin;
  if (reserva.estado_reserva) {
    reservaParaActualizar.estado_reserva = reserva.estado_reserva;
  }
  if (reserva.id_cliente) reservaParaActualizar.id_cliente = reserva.id_cliente;
  if (reserva.id_cancha) reservaParaActualizar.id_cancha = reserva.id_cancha;
  
  // Siempre actualizar el costo cuando se actualiza una reserva
  reservaParaActualizar.costo_reserva = costoReserva;
  

  
  // Actualizar la reserva
  const { error } = await supabase
    .from('reserva')
    .update(reservaParaActualizar)
    .eq('id_reserva', id);
  
  if (error) {
        throw new Error(`Error al actualizar la reserva: ${error.message}`);
  }
  
  revalidatePath('/reservas');
  return true;
}

// Eliminar una reserva
export async function eliminarReserva(id: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const { error } = await supabase
    .from('reserva')
    .delete()
    .eq('id_reserva', id);
  
  if (error) {
        throw new Error('Error al eliminar la reserva');
  }
  
  revalidatePath('/reservas');
  return true;
}

// Cambiar el estado de una reserva
export async function cambiarEstadoReserva(id: number, estado: string) {
  const supabase = createServerComponentClient({ cookies });
  
  // Validar que el estado sea válido
  const estadosValidos = ['pendiente', 'confirmada', 'cancelada', 'completada'];
  if (!estadosValidos.includes(estado)) {
    throw new Error('Estado de reserva no válido');
  }
  
  const { error } = await supabase
    .from('reserva')
    .update({ estado_reserva: estado })
    .eq('id_reserva', id);
  
  if (error) {
        throw new Error('Error al cambiar el estado de la reserva');
  }
  
  revalidatePath('/reservas');
  return true;
}

// Buscar reservas
export async function buscarReservas(query: string) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Primero obtener todas las reservas para evitar errores de columnas
    const { data: reservas, error } = await supabase
      .from('reserva')
      .select('*');
      
    if (error) {
            throw new Error('Error al buscar reservas: ' + error.message);
    }
    
    // Filtrar manualmente por el query usando nombres reales de columnas
    const reservasFiltradas = (reservas || []).filter(reserva => {
      const queryLower = query.toLowerCase();
      return (
        (reserva.fecha_reserva && reserva.fecha_reserva.includes(query)) ||
        (reserva.fecha && reserva.fecha.includes(query)) ||  // fallback
        (reserva.id_reserva && reserva.id_reserva.toString().includes(query)) ||
        (reserva.observaciones && reserva.observaciones.toLowerCase().includes(queryLower))
      );
    });
    
    // Obtener datos relacionados manualmente
    const reservasConDatos = await Promise.all(reservasFiltradas.map(async (reserva) => {
      try {
        const { data: cliente } = await supabase
          .from('cliente')
          .select('*')
          .eq('id_cliente', reserva.id_cliente)
          .single();
          
        const { data: cancha } = await supabase
          .from('cancha')
          .select('*')
          .eq('id_cancha', reserva.id_cancha)
          .single();
          
        return {
          ...reserva,
          cliente: cliente || null,
          cancha: cancha || null
        };
      } catch {
        return reserva;
      }
    }));
    
    return reservasConDatos;
  } catch (error) {
        throw new Error('Error al buscar reservas: ' + (error as Error).message);
  }
}

// Función de prueba simple para verificar acceso a base de datos
export async function verificarBaseDatos() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Verificar conectividad y sesión
    await verificarConectividad(supabase);
    
    const resultado = {
      cliente: { existe: false, estructura: null as string[] | null, error: null as string | null },
      reserva: { existe: false, estructura: null as string[] | null, error: null as string | null },
      cancha: { existe: false, estructura: null as string[] | null, error: null as string | null }
    };
    
    // Verificar tabla cliente
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('cliente')
        .select('*')
        .limit(1);
      
      if (clienteError) {
        resultado.cliente.error = clienteError.message;
      } else {
        resultado.cliente.existe = true;
        resultado.cliente.estructura = clienteData?.[0] ? Object.keys(clienteData[0]) : [];
      }
    } catch (error) {
      resultado.cliente.error = (error as Error).message;
    }
    
    // Verificar tabla reserva
    try {
      const { data: reservaData, error: reservaError } = await supabase
        .from('reserva')
        .select('*')
        .limit(1);
      
      if (reservaError) {
        resultado.reserva.error = reservaError.message;
      } else {
        resultado.reserva.existe = true;
        resultado.reserva.estructura = reservaData?.[0] ? Object.keys(reservaData[0]) : [];
      }
    } catch (error) {
      resultado.reserva.error = (error as Error).message;
    }
    
    // Verificar tabla cancha
    try {
      const { data: canchaData, error: canchaError } = await supabase
        .from('cancha')
        .select('*')
        .limit(1);
      
      if (canchaError) {
        resultado.cancha.error = canchaError.message;
      } else {
        resultado.cancha.existe = true;
        resultado.cancha.estructura = canchaData?.[0] ? Object.keys(canchaData[0]) : [];
      }
    } catch (error) {
      resultado.cancha.error = (error as Error).message;
    }
    

    return { success: true, data: resultado, message: 'Diagnóstico completado' };
  } catch (error) {
        return { success: false, error: (error as Error).message };
  }
}

// Obtener clientes activos para el formulario
export async function obtenerClientesActivos() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Verificar conectividad y sesión
    await verificarConectividad(supabase);
    
    // Primero verificar que la tabla existe
    const { error: tableError } = await supabase
      .from('cliente')
      .select('id_cliente')
      .limit(1);
      
    if (tableError) {
            throw new Error('Error al acceder a la tabla cliente: ' + tableError.message);
    }
    

    const { data: clientes, error: clientesError } = await supabase
      .from('cliente')
      .select('*')
      .order('apellido', { ascending: true });
    
    if (clientesError) {
            // Si la tabla no existe, proporcionar un mensaje más específico
      if (clientesError.message.includes('relation') && clientesError.message.includes('does not exist')) {
        throw new Error('La tabla "cliente" no existe en la base de datos. Por favor, crea la estructura de la base de datos.');
      }
      
      throw new Error('Error al cargar los clientes: ' + clientesError.message);
    }
    
    // Filtrar clientes activos si existe el campo estado_cliente
    const clientesActivos = clientes?.filter(cliente => 
      !cliente.estado_cliente || cliente.estado_cliente === 'activo'
    ) || [];
    

    return clientesActivos;
  } catch (error) {
        throw new Error('Error al cargar los clientes activos: ' + (error as Error).message);
  }
}

// Obtener canchas disponibles para el formulario
export async function obtenerCanchasDisponibles() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Verificar conectividad y sesión
    await verificarConectividad(supabase);
    
    // Primero verificar que la tabla existe
    const { error: tableError } = await supabase
      .from('cancha')
      .select('id_cancha')
      .limit(1);
      
    if (tableError) {
            throw new Error('Error al acceder a la tabla cancha: ' + tableError.message);
    }
    
    // Ahora obtener todas las canchas
    const { data: canchas, error } = await supabase
      .from('cancha')
      .select('*');
    
    if (error) {
            // Si la tabla no existe, proporcionar un mensaje más específico
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error('La tabla "cancha" no existe en la base de datos. Por favor, crea la estructura de la base de datos.');
      }
      
      throw new Error('Error al cargar las canchas: ' + error.message);
    }
    
    // Filtrar canchas disponibles usando el campo 'estado' real de tu BD
    const canchasDisponibles = canchas?.filter(cancha => {
      const estado = cancha.estado?.toLowerCase();
      
      // Excluir explícitamente canchas con estados no disponibles
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
      
      // Si tiene un estado no disponible, excluir
      if (estado && estadosNoDisponibles.includes(estado)) {
        return false;
      }
      
      // Si no tiene estado definido, incluir (por defecto disponible)
      if (!estado) return true;
      
      // Solo incluir canchas explícitamente disponibles
      return estado === 'disponible' || estado === 'activa' || estado === 'activo';
    }) || [];
    

    
    // Ordenar por nombre usando el campo real 'nombre' de tu BD
    const canchasOrdenadas = canchasDisponibles.sort((a, b) => {
      const nombreA = a.nombre || `Cancha ${a.id_cancha}`;
      const nombreB = b.nombre || `Cancha ${b.id_cancha}`;
      return nombreA.localeCompare(nombreB);
    });
    

    return canchasOrdenadas;
  } catch (error) {
        throw new Error('Error al cargar las canchas: ' + (error as Error).message);
  }
}

// Función para recalcular el costo de todas las reservas existentes
// Útil para migrar reservas que no tienen el campo costo_reserva
// ==================== FUNCIONES PARA DASHBOARD ====================

// Obtener estadísticas generales del dashboard
export async function obtenerEstadisticasDashboard() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Usar fecha local en lugar de UTC
    const hoy = new Date();
    const fechaHoy = obtenerFechaLocal(hoy);
    
    const inicioDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    const inicioMesStr = obtenerFechaLocal(inicioDelMes);
    const finMesStr = obtenerFechaLocal(finDelMes);
    

    
    // Reservas confirmadas del día
    const { data: reservasConfirmadas, error: errorConfirmadas } = await supabase
      .from('reserva')
      .select('id_reserva, estado_reserva, fecha_reserva')
      .eq('estado_reserva', 'confirmada')
      .eq('fecha_reserva', fechaHoy);
    
    if (errorConfirmadas) {
          }
    

    
    // Reservas pendientes del día
    const { data: reservasPendientes, error: errorPendientes } = await supabase
      .from('reserva')
      .select('id_reserva, estado_reserva, fecha_reserva')
      .eq('estado_reserva', 'pendiente')
      .eq('fecha_reserva', fechaHoy);
    
    if (errorPendientes) {
          }
    

    
    // Reservas de hoy para ingresos (todas las no canceladas)
    const { data: reservasHoy, error: errorIngresos } = await supabase
      .from('reserva')
      .select('id_reserva, costo_reserva, estado_reserva, fecha_reserva')
      .eq('fecha_reserva', fechaHoy)
      .neq('estado_reserva', 'cancelada');
    
    if (errorIngresos) {
          }
    

    
    // Ingresos del día
    const ingresosDiarios = reservasHoy?.reduce((total, reserva) => {
      const costo = reserva.costo_reserva || 0;

      return total + costo;
    }, 0) || 0;
    

    
    // Reservas mensuales e ingresos
    const { data: reservasMensuales } = await supabase
      .from('reserva')
      .select('costo_reserva, fecha_reserva')
      .gte('fecha_reserva', inicioMesStr)
      .lte('fecha_reserva', finMesStr)
      .neq('estado_reserva', 'cancelada');
    
    const ingresosMensuales = reservasMensuales?.reduce((total, reserva) => 
      total + (reserva.costo_reserva || 0), 0) || 0;
    
    // Total de canchas y disponibles
    const { data: canchas, error: errorCanchas } = await supabase
      .from('cancha')
      .select('id_cancha, estado_cancha');
    
    if (errorCanchas) {
          }
    

    
    const canchasDisponibles = canchas?.filter(cancha => {
      const estado = cancha.estado_cancha?.toLowerCase();

      return estado === 'disponible';
    }).length || 0;
    

    
    // Clientes activos (con reservas este mes)
    const { data: clientesActivos, error: errorClientes } = await supabase
      .from('reserva')
      .select('id_cliente, fecha_reserva')
      .gte('fecha_reserva', inicioMesStr)
      .lte('fecha_reserva', finMesStr)
      .neq('estado_reserva', 'cancelada');
    
    if (errorClientes) {
          }
    
    const clientesUnicos = new Set(clientesActivos?.map(r => r.id_cliente)).size;

    


    
    return {
      reservasConfirmadas: reservasConfirmadas?.length || 0,
      reservasPendientes: reservasPendientes?.length || 0,
      ingresosDiarios,
      ingresosMensuales,
      canchasDisponibles,
      totalCanchas: canchas?.length || 0,
      clientesActivos: clientesUnicos,
      totalReservasMensuales: reservasMensuales?.length || 0
    };
  } catch {
        return {
      reservasConfirmadas: 0,
      reservasPendientes: 0,
      ingresosDiarios: 0,
      ingresosMensuales: 0,
      canchasDisponibles: 0,
      totalCanchas: 0,
      clientesActivos: 0,
      totalReservasMensuales: 0
    };
  }
}

// Función de debug para verificar datos directamente
// Obtener datos para gráfico de reservas por horario
export async function obtenerReservasPorHorario() {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: reservas } = await supabase
      .from('reserva')
      .select('hora_inicio')
      .neq('estado_reserva', 'cancelada');
    
    const horarios: { [key: string]: number } = {};
    
    reservas?.forEach(reserva => {
      const hora = reserva.hora_inicio.substring(0, 2) + ':00';
      horarios[hora] = (horarios[hora] || 0) + 1;
    });
    
    // Convertir a array ordenado
    return Object.entries(horarios)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hora, cantidad]) => ({ hora, cantidad }));
  } catch {
        return [];
  }
}

// Obtener datos para gráfico de reservas por día de la semana
export async function obtenerReservasPorDiaSemana() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Obtener reservas del mes actual para tener datos más relevantes
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesStr = obtenerFechaLocal(inicioMes);
    
    const { data: reservas, error } = await supabase
      .from('reserva')
      .select('fecha_reserva')
      .gte('fecha_reserva', inicioMesStr)
      .neq('estado_reserva', 'cancelada');
    
    if (error) {
      throw new Error(`Error al obtener reservas: ${error.message}`);
    }
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const conteo = Array(7).fill(0);
    
    reservas?.forEach(reserva => {
      // Usar la función local para consistencia con el timezone
      const fechaStr = reserva.fecha_reserva + 'T00:00:00';
      const fecha = new Date(fechaStr);
      const diaSemana = fecha.getDay();
      
      // Validar que el día sea válido
      if (diaSemana >= 0 && diaSemana <= 6) {
        conteo[diaSemana]++;
      }
    });
    
    return dias.map((dia, index) => ({ dia, cantidad: conteo[index] }));
  } catch {
        // Retornar datos vacíos pero válidos
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias.map(dia => ({ dia, cantidad: 0 }));
  }
}

// Obtener canchas más reservadas
export async function obtenerCanchasMasReservadas() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Obtener fecha actual en Argentina (UTC-3)
    const ahora = new Date();
    const horaArgentina = new Date(ahora.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
    
    // Calcular el lunes de la semana actual
    const diaSemana = horaArgentina.getDay(); // 0 = domingo, 1 = lunes, etc.
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1; // Si es domingo, retroceder 6 días
    
    const lunesActual = new Date(horaArgentina);
    lunesActual.setDate(horaArgentina.getDate() - diasHastaLunes);
    lunesActual.setHours(0, 0, 0, 0);
    
    // El domingo de la semana actual
    const domingoActual = new Date(lunesActual);
    domingoActual.setDate(lunesActual.getDate() + 6);
    domingoActual.setHours(23, 59, 59, 999);
    
    // Convertir a formato de fecha local para la consulta
    const fechaInicio = obtenerFechaLocal(lunesActual);
    const fechaFin = obtenerFechaLocal(domingoActual);
    
    // Obtener TODAS las canchas primero
    const { data: todasCanchas, error: errorCanchas } = await supabase
      .from('cancha')
      .select('id_cancha, nombre')
      .order('nombre');
    
    if (errorCanchas) {
      throw new Error(`Error al obtener canchas: ${errorCanchas.message}`);
    }
    
    // Obtener reservas de la semana actual (lunes a domingo)
    const { data: reservasSemanaActual, error: errorReservas } = await supabase
      .from('reserva')
      .select('id_cancha, fecha_reserva')
      .gte('fecha_reserva', fechaInicio)
      .lte('fecha_reserva', fechaFin)
      .neq('estado_reserva', 'cancelada');
    
    if (errorReservas) {
      throw new Error(`Error al obtener reservas: ${errorReservas.message}`);
    }
    
    // Contar reservas por cancha
    const conteoReservas: { [key: number]: number } = {};
    
    reservasSemanaActual?.forEach((reserva) => {
      const id = reserva.id_cancha;
      conteoReservas[id] = (conteoReservas[id] || 0) + 1;
    });
    
    // Crear resultado con TODAS las canchas, incluso las que tienen 0 reservas
    const resultado = todasCanchas?.map(cancha => ({
      nombre: cancha.nombre,
      cantidad: conteoReservas[cancha.id_cancha] || 0
    })) || [];
    
    // Ordenar por cantidad de reservas (mayor a menor) pero mantener todas
    return resultado.sort((a, b) => b.cantidad - a.cantidad);
    
  } catch {
        return [];
  }
}

// Obtener ingresos por mes (últimos 6 meses)
export async function obtenerIngresosMensuales() {
  try {
    const supabase = createServerComponentClient({ cookies });
    const hoy = new Date();
    const meses = [];
    
    // Generar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
      
      const inicioMesStr = obtenerFechaLocal(inicioMes);
      const finMesStr = obtenerFechaLocal(finMes);
      
      const { data: reservas } = await supabase
        .from('reserva')
        .select('costo_reserva')
        .gte('fecha_reserva', inicioMesStr)
        .lte('fecha_reserva', finMesStr)
        .neq('estado_reserva', 'cancelada');
      
      const ingresos = reservas?.reduce((total, reserva) => 
        total + (reserva.costo_reserva || 0), 0) || 0;
      
      meses.push({
        mes: fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        ingresos
      });
    }
    
    return meses;
  } catch {
        return [];
  }
}

// Obtener horarios disponibles por cancha para hoy - TODAS las canchas del predio
export async function obtenerHorariosDisponibles() {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Obtener fecha y hora actual (asumiendo que el servidor está en horario argentino)
    const ahora = new Date();
    const hoy = obtenerFechaLocal(ahora);
    const horaActual = ahora.getHours();
    

    
    // Obtener TODAS las canchas del predio (sin filtrar por estado)
    const { data: canchas, error: errorCanchas } = await supabase
      .from('cancha')
      .select('*')
      .order('id_cancha');
    
    if (errorCanchas) {
      throw new Error(`Error al obtener canchas: ${errorCanchas.message}`);
    }
    
    // Obtener reservas de hoy (solo activas: confirmadas y pendientes)
    const { data: reservasHoy, error: errorReservas } = await supabase
      .from('reserva')
      .select('id_cancha, hora_inicio, hora_fin')
      .eq('fecha_reserva', hoy)
      .in('estado_reserva', ['confirmada', 'pendiente']);
    
    if (errorReservas) {
      throw new Error(`Error al obtener reservas: ${errorReservas.message}`);
    }
    

    const generarHorariosCompletos = (cancha: { id_cancha: number; nombre: string; estado?: string; estado_cancha?: string }, reservasCancha: { hora_inicio: string; hora_fin: string }[]) => {
      const horariosDisponibles: string[] = [];
      const horariosPasados: string[] = [];
      
      // Verificar si la cancha está disponible para reservas
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
      
      const canchaEnMantenimiento = 
        (estadoReal && estadosNoDisponibles.includes(estadoReal)) || 
        (estadoCompatibilidad && estadosNoDisponibles.includes(estadoCompatibilidad));
      
      // Horario de funcionamiento completo (8:00 - 23:00, incluyendo 23:00)
      const horaInicio = 8;
      const horaFin = 24; // Cambiado para incluir 23:00
      
      // Crear mapa de horarios ocupados por reservas
      const horariosReservados = new Set<string>();
      const rangosOcupados: string[] = [];
      
      reservasCancha.forEach(reserva => {
        const inicioHora = parseInt(reserva.hora_inicio.split(':')[0]);
        const finHora = parseInt(reserva.hora_fin.split(':')[0]) || 24; // 00:00 = 24
        

        for (let h = inicioHora; h < finHora; h++) {
          const horaStr = h.toString().padStart(2, '0') + ':00';
          horariosReservados.add(horaStr);
        }
        
        // Agregar el rango completo a la lista de ocupados
        const rangoCompleto = `${reserva.hora_inicio.substring(0, 5)}-${reserva.hora_fin === '00:00' ? '00:00' : reserva.hora_fin.substring(0, 5)}`;
        if (!rangosOcupados.includes(rangoCompleto)) {
          rangosOcupados.push(rangoCompleto);
        }
      });
      

      for (let hora = horaInicio; hora < horaFin && hora <= 23; hora++) {
        const horaStr = hora.toString().padStart(2, '0') + ':00';
        
        // Verificar si el horario ya pasó (solo para el día actual)
        // Un horario se considera pasado si:
        // 1. La hora es menor a la actual (ej: 16:00 cuando son las 19:xx)
        // 2. Es la misma hora pero ya pasó (ej: 19:00 cuando son las 19:01)
        const esHorarioPasado = hora <= horaActual;
        

        
        // Verificar si está ocupado por reserva
        const estaOcupado = horariosReservados.has(horaStr);
        
        if (canchaEnMantenimiento) {
          // Si la cancha está en mantenimiento, no hay horarios disponibles
          // Los horarios se mostrarán como "no disponible por mantenimiento"
        } else if (esHorarioPasado) {
          horariosPasados.push(horaStr);
        } else if (estaOcupado) {
          // Ya está en rangosOcupados
        } else {
          horariosDisponibles.push(horaStr);
        }
      }
      
      return {
        horariosOcupados: rangosOcupados,
        horariosDisponibles: horariosDisponibles,
        horariosPasados: horariosPasados,
        canchaEnMantenimiento: !!canchaEnMantenimiento, // Forzar boolean
        estadoCancha: canchaEnMantenimiento ? 'En mantenimiento' : 'Operativa'
      };
    };
    
    return canchas?.map(cancha => {
      const reservasCancha = reservasHoy?.filter(r => r.id_cancha === cancha.id_cancha) || [];
      const { horariosOcupados, horariosDisponibles, horariosPasados, canchaEnMantenimiento, estadoCancha } = generarHorariosCompletos(cancha, reservasCancha);
      
      return {
        id_cancha: cancha.id_cancha,
        nombre: cancha.nombre || `Cancha ${cancha.id_cancha}`,
        tipo: cancha.tipo || 'N/A',
        tarifa_hora: cancha.tarifa_hora || 0,
        disponibilidad_horaria: cancha.disponibilidad_horaria || '08:00-23:00',
        horariosOcupados,
        horariosDisponibles,
        horariosPasados,
        canchaEnMantenimiento,
        estadoCancha,
        totalHorariosHoy: 16 // 8:00 a 23:00 = 16 horarios
      };
    }) || [];
    
  } catch {
        return [];
  }
}

// Obtener reservas para el dashboard (con filtro de fecha opcional)
export async function obtenerReservasRecientes(limite = 10, fechaFiltro?: string) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    let query = supabase
      .from('reserva')
      .select(`
        *,
        cliente:cliente(nombre, apellido),
        cancha:cancha(nombre)
      `);
    
    // Si se proporciona una fecha específica, filtrar por esa fecha
    if (fechaFiltro) {
      query = query.eq('fecha_reserva', fechaFiltro);
    }
    
    const { data: reservas } = await query
      .order('fecha_reserva', { ascending: false })
      .order('hora_inicio', { ascending: false })
      .limit(limite);
    
    return reservas?.map((reserva) => ({
      id_reserva: reserva.id_reserva,
      cliente_nombre: `${reserva.cliente?.nombre || ''} ${reserva.cliente?.apellido || ''}`.trim(),
      cancha_nombre: reserva.cancha?.nombre || `Cancha ${reserva.id_cancha}`,
      fecha_reserva: reserva.fecha_reserva,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      estado_reserva: reserva.estado_reserva,
      costo_reserva: reserva.costo_reserva
    })) || [];
  } catch {
        return [];
  }
}

// Obtener reservas del día actual para el dashboard
export async function obtenerReservasDelDia(limite = 20) {
  try {
    // Obtener fecha actual (asumiendo servidor en horario argentino)
    const hoy = obtenerFechaLocal(new Date());
    return await obtenerReservasRecientes(limite, hoy);
  } catch {
        return [];
  }
}

// ==========================================
// SISTEMA DE CANCELACIÓN AUTOMÁTICA
// ==========================================

// Función para obtener reservas pendientes que exceden el tiempo límite
export async function obtenerReservasPendientesVencidas(tiempoLimiteMinutos = 5) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    await verificarConectividad(supabase);
    
    // Calcular el timestamp límite (5 minutos atrás)
    const tiempoLimite = new Date();
    tiempoLimite.setMinutes(tiempoLimite.getMinutes() - tiempoLimiteMinutos);
    
    const { data, error } = await supabase
      .from('reserva')
      .select('id_reserva, fecha_reserva, hora_inicio, created_at, estado_reserva')
      .eq('estado_reserva', 'pendiente')
      .lt('created_at', tiempoLimite.toISOString());
    
    if (error) {
            return [];
    }
    
    return data || [];
  } catch {
        return [];
  }
}

// Función para cancelar automáticamente reservas pendientes vencidas
export async function cancelarReservasPendientesVencidas() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    await verificarConectividad(supabase);
    
    // Obtener reservas vencidas
    const reservasVencidas = await obtenerReservasPendientesVencidas();
    
    if (reservasVencidas.length === 0) {
      return { 
        success: true,
        canceladas: 0, 
        mensaje: 'No hay reservas pendientes vencidas' 
      };
    }
    
    // Extraer IDs de las reservas vencidas
    const idsVencidos = reservasVencidas.map(r => r.id_reserva);
    
    // Actualizar todas las reservas vencidas a estado "cancelada"
    const { error } = await supabase
      .from('reserva')
      .update({ 
        estado_reserva: 'cancelada'
      })
      .in('id_reserva', idsVencidos);
    
    if (error) {
            throw new Error('Error al cancelar reservas vencidas');
    }
    

    
    // Revalidar páginas relacionadas
    revalidatePath('/reservas');
    revalidatePath('/dashboard');
    
    return {
      success: true,
      canceladas: reservasVencidas.length,
      mensaje: `Se cancelaron ${reservasVencidas.length} reservas pendientes que excedieron el tiempo límite de 5 minutos`,
      reservas: reservasVencidas
    };
    
  } catch (error) {
        return {
      success: false,
      canceladas: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Función para verificar el tiempo restante de una reserva pendiente
export async function obtenerTiempoRestanteReserva(idReserva: number) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { data, error } = await supabase
      .from('reserva')
      .select('created_at, estado_reserva')
      .eq('id_reserva', idReserva)
      .eq('estado_reserva', 'pendiente')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const fechaCreacion = new Date(data.created_at);
    const ahora = new Date();
    const tiempoTranscurridoMs = ahora.getTime() - fechaCreacion.getTime();
    const tiempoLimiteMs = 5 * 60 * 1000; // 5 minutos en milisegundos
    const tiempoRestanteMs = Math.max(0, tiempoLimiteMs - tiempoTranscurridoMs);
    
    const minutosRestantes = Math.floor(tiempoRestanteMs / (60 * 1000));
    const segundosRestantes = Math.floor(tiempoRestanteMs / 1000);
    
    return {
      minutosRestantes,
      segundosRestantes,
      vencida: tiempoRestanteMs === 0,
      porcentajeTranscurrido: Math.min(100, (tiempoTranscurridoMs / tiempoLimiteMs) * 100)
    };
    
  } catch {
        return null;
  }
}



