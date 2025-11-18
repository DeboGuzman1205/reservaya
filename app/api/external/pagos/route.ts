import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { 
  ApiResponse, 
  CrearPagoRequest, 
  ActualizarPagoRequest 
} from "@/types/api";

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

// 🧩 POST — Crear/Actualizar pago (UPSERT)
export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request))
      return jsonResponse(401, { success: false, error: "API Key no válida" });

    const body: CrearPagoRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.id_reserva || body.monto === undefined || !body.estado_pago) {
      return jsonResponse(400, { 
        success: false, 
        error: "Campos requeridos: id_reserva, monto, estado_pago" 
      });
    }

    // Validar estados válidos
    if (!['aprobado', 'pendiente', 'cancelado', 'desconocido'].includes(body.estado_pago)) {
      return jsonResponse(400, { 
        success: false, 
        error: "estado_pago debe ser: aprobado, pendiente, cancelado o desconocido" 
      });
    }

    const supabase = getSupabaseClient();

    // 1. Verificar que la reserva existe
    const { data: reserva, error: reservaError } = await supabase
      .from('reserva')
      .select('id_reserva, fecha_reserva, hora_inicio, hora_fin, estado_reserva, costo_reserva')
      .eq('id_reserva', body.id_reserva)
      .single();

    if (reservaError || !reserva) {
      return jsonResponse(404, { 
        success: false, 
        error: "Reserva no encontrada" 
      });
    }

    let pago;
    let message = "";

    // 2. UPSERT: Verificar si ya existe un pago para esta reserva con el mismo mp_id
    if (body.mp_id) {
      // Si hay mp_id, buscar pago existente por mp_id
      const { data: pagoExistente, error: buscarError } = await supabase
        .from('pago')
        .select('id_pago, id_reserva, monto, estado_pago')
        .eq('mp_id', body.mp_id)
        .single();

      if (pagoExistente && !buscarError) {
        // Actualizar pago existente
        const { data: pagoActualizado, error: actualizarError } = await supabase
          .from('pago')
          .update({
            monto: body.monto,
            estado_pago: body.estado_pago,
            id_reserva: body.id_reserva
          })
          .eq('mp_id', body.mp_id)
          .select(`
            id_pago,
            id_reserva,
            monto,
            estado_pago,
            mp_id,
            fecha_pago
          `)
          .single();

        if (actualizarError) {
          return jsonResponse(500, { 
            success: false, 
            error: "Error al actualizar el pago en la base de datos" 
          });
        }

        pago = pagoActualizado;
        message = `Pago de $${body.monto} actualizado exitosamente`;
      }
    }

    // Si no hay pago existente, crear uno nuevo
    if (!pago) {
      // También verificar si ya existe un pago para esta reserva (sin mp_id)
      const { data: pagoReserva, error: buscarReservaError } = await supabase
        .from('pago')
        .select('id_pago')
        .eq('id_reserva', body.id_reserva)
        .single();

      if (pagoReserva && !buscarReservaError) {
        // Ya existe un pago para esta reserva, actualizar
        const { data: pagoActualizado, error: actualizarError } = await supabase
          .from('pago')
          .update({
            monto: body.monto,
            estado_pago: body.estado_pago,
            mp_id: body.mp_id || null
          })
          .eq('id_reserva', body.id_reserva)
          .select(`
            id_pago,
            id_reserva,
            monto,
            estado_pago,
            mp_id,
            fecha_pago
          `)
          .single();

        if (actualizarError) {
          return jsonResponse(500, { 
            success: false, 
            error: "Error al actualizar el pago en la base de datos" 
          });
        }

        pago = pagoActualizado;
        message = `Pago de $${body.monto} actualizado exitosamente (por reserva)`;
      } else {
        // Crear nuevo pago
        const { data: pagoNuevo, error: crearError } = await supabase
          .from('pago')
          .insert({
            id_reserva: body.id_reserva,
            monto: body.monto,
            estado_pago: body.estado_pago,
            mp_id: body.mp_id || null
          })
          .select(`
            id_pago,
            id_reserva,
            monto,
            estado_pago,
            mp_id,
            fecha_pago
          `)
          .single();

        if (crearError) {
          return jsonResponse(500, { 
            success: false, 
            error: "Error al crear el pago en la base de datos" 
          });
        }

        pago = pagoNuevo;
        message = `Pago de $${body.monto} creado exitosamente`;
      }
    }

    return jsonResponse(200, {
      success: true,
      data: pago,
      message: message
    });

  } catch (e) {
    return jsonResponse(500, {
      success: false,
      error: e instanceof Error ? e.message : "Error interno del servidor"
    });
  }
}

// 🧩 PUT — Actualizar estado de pago
export async function PUT(request: NextRequest) {
  try {
    if (!validateApiKey(request))
      return jsonResponse(401, { success: false, error: "API Key no válida" });

    const body: ActualizarPagoRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.id_pago || !body.estado_pago) {
      return jsonResponse(400, { 
        success: false, 
        error: "Campos requeridos: id_pago, estado_pago" 
      });
    }

    // Validar estados válidos
    if (!['aprobado', 'pendiente', 'cancelado', 'desconocido'].includes(body.estado_pago)) {
      return jsonResponse(400, { 
        success: false, 
        error: "estado_pago debe ser: aprobado, pendiente, cancelado o desconocido" 
      });
    }

    const supabase = getSupabaseClient();

    // 1. Verificar que el pago existe
    const { data: pagoExistente, error: buscarError } = await supabase
      .from('pago')
      .select('id_pago, estado_pago, monto')
      .eq('id_pago', body.id_pago)
      .single();

    if (buscarError || !pagoExistente) {
      return jsonResponse(404, { 
        success: false, 
        error: "Pago no encontrado" 
      });
    }

    // 2. Actualizar estado del pago
    const updateData: {
      estado_pago: string;
      mp_id?: string | null;
    } = {
      estado_pago: body.estado_pago
    };

    if (body.mp_id !== undefined) {
      updateData.mp_id = body.mp_id;
    }

    const { data: pagoActualizado, error: actualizarError } = await supabase
      .from('pago')
      .update(updateData)
      .eq('id_pago', body.id_pago)
      .select(`
        id_pago,
        id_reserva,
        monto,
        estado_pago,
        mp_id,
        fecha_pago
      `)
      .single();

    if (actualizarError) {
      return jsonResponse(500, { 
        success: false, 
        error: "Error al actualizar el estado del pago" 
      });
    }

    return jsonResponse(200, {
      success: true,
      data: pagoActualizado,
      message: `Estado del pago actualizado a: ${body.estado_pago}`
    });

  } catch (e) {
    return jsonResponse(500, {
      success: false,
      error: e instanceof Error ? e.message : "Error interno del servidor"
    });
  }
}

// 🧩 GET — Obtener pagos (opcional, para uso interno)
export async function GET(request: NextRequest) {
  try {
    if (!validateApiKey(request))
      return jsonResponse(401, { success: false, error: "API Key no válida" });

    const { searchParams } = new URL(request.url);
    const idReserva = searchParams.get('id_reserva');
    const estadoPago = searchParams.get('estado_pago');

    const supabase = getSupabaseClient();

    let query = supabase
      .from('pago')
      .select(`
        id_pago,
        id_reserva,
        monto,
        estado_pago,
        mp_id,
        fecha_pago
      `)
      .order('fecha_pago', { ascending: false });

    if (idReserva) {
      query = query.eq('id_reserva', parseInt(idReserva));
    }

    if (estadoPago) {
      query = query.eq('estado_pago', estadoPago);
    }

    const { data: pagos, error: pagosError } = await query;

    if (pagosError) {
      return jsonResponse(500, { 
        success: false, 
        error: "Error al consultar los pagos" 
      });
    }

    return jsonResponse(200, {
      success: true,
      data: pagos || [],
      message: `${pagos?.length || 0} pagos encontrados`
    });

  } catch (e) {
    return jsonResponse(500, {
      success: false,
      error: e instanceof Error ? e.message : "Error interno del servidor"
    });
  }
}
