import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  ApiResponse, 
  CrearReservaRequest, 
  ActualizarReservaRequest, 
  ReservaResponse 
} from '@/types/api';

// ✅ Inicializador de cliente Supabase
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de entorno de Supabase");
  return createClient(url, key);
}

// ✅ Validar API key de n8n


function validateApiKey(request: NextRequest) {
  return request.headers.get("x-api-key") === process.env.N8N_API_KEY;
}

// ✅ Helper para devolver respuesta unificada
function jsonResponse<T>(status: number, payload: ApiResponse<T>) {
  return NextResponse.json(payload, { status });
}

// ✅ Calcular hora_fin basado en hora_inicio y duración
function calcularHoraFin(horaInicio: string, duracionHoras: number = 1): string {
  const [horas, minutos] = horaInicio.split(':').map(Number);
  const fechaInicio = new Date();
  fechaInicio.setHours(horas, minutos, 0, 0);
  
  const fechaFin = new Date(fechaInicio.getTime() + (duracionHoras * 60 * 60 * 1000));
  
  return `${fechaFin.getHours().toString().padStart(2, '0')}:${fechaFin.getMinutes().toString().padStart(2, '0')}`;
}

// 🧩 POST — Crear nueva reserva con chat_id
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request))
      return jsonResponse(401, { success: false, error: "API Key no válida" });

    const body: CrearReservaRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.chat_id || !body.id_cancha || !body.fecha_reserva || !body.hora_inicio || !body.estado_reserva || body.costo_reserva === undefined) {
      return jsonResponse(400, { 
        success: false, 
        error: "Campos requeridos: chat_id, id_cancha, fecha_reserva, hora_inicio, estado_reserva, costo_reserva" 
      });
    }

    const supabase = getSupabaseClient();

    // 1. Buscar cliente por chat_id
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente, nombre, apellido, telefono, chat_id')
      .eq('chat_id', body.chat_id)
      .single();

    if (clienteError || !cliente) {
      return jsonResponse(404, { 
        success: false, 
        error: "Cliente no encontrado. Debe registrarse primero." 
      });
    }

    // 2. Verificar que la cancha existe y está disponible
    const { data: cancha, error: canchaError } = await supabase
      .from('cancha')
      .select('id_cancha, nombre, tipo, estado_cancha, tarifa_hora')
      .eq('id_cancha', body.id_cancha)
      .eq('estado_cancha', 'disponible')
      .single();

    if (canchaError || !cancha) {
      return jsonResponse(404, { 
        success: false, 
        error: "La cancha no existe o no está disponible" 
      });
    }

    // 3. Calcular hora_fin basado en duración
    const duracionHoras = body.duracion_horas || 1;
    const horaFin = calcularHoraFin(body.hora_inicio, duracionHoras);

    // 4. Verificar reserva exacta duplicada (seguridad adicional)
    const { data: reservaExacta, error: exactaError } = await supabase
      .from('reserva')
      .select('id_reserva, estado_reserva, id_cliente')
      .eq('id_cancha', body.id_cancha)
      .eq('fecha_reserva', body.fecha_reserva)
      .eq('hora_inicio', body.hora_inicio)
      .in('estado_reserva', ['pendiente', 'confirmada']);

    if (exactaError) {
      throw new Error("Error al verificar reservas existentes");
    }

    if (reservaExacta && reservaExacta.length > 0) {
      const reservaDuplicada = reservaExacta[0];
      return jsonResponse(409, { 
        success: false, 
        error: `Ya existe una reserva ${reservaDuplicada.estado_reserva} para esa cancha en ese horario exacto (ID: ${reservaDuplicada.id_reserva})` 
      });
    }


    const { data: conflictos } = await supabase
      .from('reserva')
      .select('id_reserva, hora_inicio, hora_fin, estado_reserva')
      .eq('id_cancha', body.id_cancha)
      .eq('fecha_reserva', body.fecha_reserva)
      .in('estado_reserva', ['confirmada', 'pendiente'])
      .or(`and(hora_inicio.lt.${horaFin},hora_fin.gt.${body.hora_inicio})`);

    if (conflictos && conflictos.length > 0) {
      return jsonResponse(409, { 
        success: false, 
        error: `Horario ocupado. Conflictos: ${conflictos.map(c => `${c.hora_inicio}-${c.hora_fin} (${c.estado_reserva})`).join(', ')}` 
      });
    }

    // 6. Crear la reserva
    const { data: reserva, error: reservaError } = await supabase
      .from('reserva')
      .insert({
        id_cliente: cliente.id_cliente,
        id_cancha: body.id_cancha,
        fecha_reserva: body.fecha_reserva,
        hora_inicio: body.hora_inicio,
        hora_fin: horaFin,
        estado_reserva: body.estado_reserva,
        costo_reserva: body.costo_reserva
      })
      .select('id_reserva, id_cliente, id_cancha, fecha_reserva, hora_inicio, hora_fin, estado_reserva, costo_reserva, created_at')
      .single();

    if (reservaError) {
      return jsonResponse(500, { 
        success: false, 
        error: "Error al crear la reserva en la base de datos" 
      });
    }

    // 7. Respuesta con datos completos
    const reservaCompleta: ReservaResponse = {
      ...reserva,
      cliente: {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
        chat_id: cliente.chat_id
      },
      cancha: {
        nombre: cancha.nombre,
        tipo: cancha.tipo,
        tarifa_hora: cancha.tarifa_hora
      }
    };

    return jsonResponse<ReservaResponse>(200, {
      success: true,
      data: reservaCompleta,
      message: `Reserva creada exitosamente para ${cliente.nombre} ${cliente.apellido}`
    });

  } catch (e) {
    return jsonResponse(500, {
      success: false,
      error: e instanceof Error ? e.message : "Error interno del servidor"
    });
  }
}

// 🧩 PUT — Actualizar estado de reserva
export async function PUT(request: NextRequest) {
  try {
    if (!validateApiKey(request))
      return jsonResponse(401, { success: false, error: "API Key no válida" });

    const body: ActualizarReservaRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.id_reserva || !body.estado_reserva) {
      return jsonResponse(400, { 
        success: false, 
        error: "Campos requeridos: id_reserva, estado_reserva" 
      });
    }

    // Validar estados válidos
    if (!['pendiente', 'confirmada', 'cancelada'].includes(body.estado_reserva)) {
      return jsonResponse(400, { 
        success: false, 
        error: "estado_reserva debe ser: pendiente, confirmada o cancelada" 
      });
    }

    const supabase = getSupabaseClient();

    // 1. Verificar que la reserva existe
    const { data: reservaExistente, error: buscarError } = await supabase
      .from('reserva')
      .select('id_reserva, estado_reserva, id_cliente, id_cancha')
      .eq('id_reserva', body.id_reserva)
      .single();

    if (buscarError || !reservaExistente) {
      return jsonResponse(404, { 
        success: false, 
        error: "Reserva no encontrada" 
      });
    }

    // 2. Actualizar estado de la reserva
    const { data: reservaActualizada, error: actualizarError } = await supabase
      .from('reserva')
      .update({ 
        estado_reserva: body.estado_reserva,
        updated_at: new Date().toISOString()
      })
      .eq('id_reserva', body.id_reserva)
      .select(`
        id_reserva, 
        id_cliente, 
        id_cancha, 
        fecha_reserva, 
        hora_inicio, 
        hora_fin, 
        estado_reserva, 
        costo_reserva, 
        created_at,
        cliente:id_cliente(nombre, apellido, telefono, chat_id)
      `)
      .single();

    if (actualizarError) {
      return jsonResponse(500, { 
        success: false, 
        error: "Error al actualizar el estado de la reserva" 
      });
    }

    return jsonResponse(200, {
      success: true,
      data: reservaActualizada,
      message: `Estado de reserva actualizado a: ${body.estado_reserva}`
    });

  } catch (e) {
    return jsonResponse(500, {
      success: false,
      error: e instanceof Error ? e.message : "Error interno del servidor"
    });
  }
}