import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.N8N_API_KEY;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'API Key no válida'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');
    const todasLasReservas = searchParams.get('todas') === 'true'; // Parámetro para ver todas las reservas

    if (!chatId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El parámetro chat_id es requerido'
      }, { status: 400 });
    }

    // Obtener fecha actual en zona horaria de Argentina (UTC-3)
    const ahora = new Date();
    const fechaArgentina = new Date(ahora.getTime() - (3 * 60 * 60 * 1000));
    const fechaActual = fechaArgentina.toISOString().split('T')[0];
    
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente, nombre, apellido, telefono, chat_id')
      .eq('chat_id', chatId)
      .single();

    if (clienteError) {
      if (clienteError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Cliente no encontrado con el chat_id proporcionado'
        }, { status: 404 });
      }
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Error al buscar cliente: ${clienteError.message}`
      }, { status: 500 });
    }

    let query = supabase
      .from('reserva')
      .select('id_reserva, id_cancha, fecha_reserva, hora_inicio, hora_fin, estado_reserva, costo_reserva, created_at')
      .eq('id_cliente', cliente.id_cliente)
      .in('estado_reserva', ['confirmada', 'pendiente']);
    
    // Solo filtrar por fecha si no se solicitan todas las reservas
    if (!todasLasReservas) {
      query = query.gte('fecha_reserva', fechaActual);
    }
    
    const { data: reservas, error: reservasError } = await query
      .order('fecha_reserva', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (reservasError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Error al consultar las reservas: ${reservasError.message}`
      }, { status: 500 });
    }

    // Si no hay reservas, devolver respuesta vacía
    if (!reservas || reservas.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          cliente: {
            id: cliente.id_cliente,
            chat_id: cliente.chat_id,
            nombre: cliente.nombre,
            apellido: cliente.apellido,
            telefono: cliente.telefono
          },
          total_reservas: 0,
          reservas: []
        }
      });
    }

    // Obtener información de las canchas relacionadas
    const canchaIds = [...new Set(reservas.map(r => r.id_cancha))];
    const { data: canchasData, error: canchasError } = await supabase
      .from('cancha')
      .select('id_cancha, nombre, tipo')
      .in('id_cancha', canchaIds);

    if (canchasError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Error al consultar las canchas: ${canchasError.message}`
      }, { status: 500 });
    }

    // Crear un mapa de canchas para fácil acceso
    const canchasMap = (canchasData || []).reduce((acc, cancha) => {
      acc[cancha.id_cancha] = cancha;
      return acc;
    }, {} as Record<number, { id_cancha: number; nombre: string; tipo: string }>);

    // Formatear las reservas para la respuesta
    const reservasFormateadas = reservas.map(reserva => {
      const canchaInfo = canchasMap[reserva.id_cancha];
      
      return {
        nro_reserva: reserva.id_reserva,
        fecha: reserva.fecha_reserva,
        hora_inicio: reserva.hora_inicio,
        hora_fin: reserva.hora_fin,
        cancha: {
          id: reserva.id_cancha,
          nombre: canchaInfo?.nombre || `CANCHA ${reserva.id_cancha}`,
          cancha_tipo: canchaInfo?.tipo ? `${canchaInfo.tipo}VS${canchaInfo.tipo}` : 'Fútbol',
        },
        costo: reserva.costo_reserva,
        estado: reserva.estado_reserva,
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        cliente: {
          id: cliente.id_cliente,
          chat_id: cliente.chat_id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono
        },
        total_reservas: reservasFormateadas.length,
        reservas: reservasFormateadas
      }
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}