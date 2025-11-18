import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse } from '@/types/api';

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
    const tipo = searchParams.get('tipo'); // 'canchas', 'deportes', 'horarios', 'precios'

    switch (tipo) {
      case 'canchas':
        const { data: canchas } = await supabase
          .from('cancha')
          .select('id_cancha, nombre, tipo_deporte, precio_hora, estado')
          .eq('estado', 'disponible')
          .order('nombre');

        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            canchas: canchas || [],
            total: canchas?.length || 0
          }
        });

      case 'deportes':
        const { data: deportes } = await supabase
          .from('cancha')
          .select('tipo_deporte')
          .eq('estado', 'disponible');

        const deportesUnicos = [...new Set(deportes?.map(d => d.tipo_deporte) || [])];

        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            deportes: deportesUnicos,
            total: deportesUnicos.length
          }
        });

      case 'horarios':
        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            horarios_disponibles: [
              '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
              '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
              '20:00', '21:00'
            ],
            horario_apertura: '08:00',
            horario_cierre: '22:00',
            duracion_minima: '1 hora'
          }
        });

      case 'precios':
        const { data: precios } = await supabase
          .from('cancha')
          .select('tipo_deporte, precio_hora')
          .eq('estado', 'disponible');

        const preciosPorDeporte = precios?.reduce((acc, cancha) => {
          if (!acc[cancha.tipo_deporte]) {
            acc[cancha.tipo_deporte] = {
              precio_min: cancha.precio_hora,
              precio_max: cancha.precio_hora,
              precio_promedio: cancha.precio_hora
            };
          } else {
            acc[cancha.tipo_deporte].precio_min = Math.min(acc[cancha.tipo_deporte].precio_min, cancha.precio_hora);
            acc[cancha.tipo_deporte].precio_max = Math.max(acc[cancha.tipo_deporte].precio_max, cancha.precio_hora);
          }
          return acc;
        }, {} as Record<string, { precio_min: number; precio_max: number; precio_promedio: number }>);

        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            precios_por_deporte: preciosPorDeporte || {},
            moneda: 'ARS'
          }
        });

      default:
        // Información general
        const [
          { data: totalCanchas },
          { data: totalClientes },
          { data: reservasHoy }
        ] = await Promise.all([
          supabase
            .from('cancha')
            .select('id_cancha', { count: 'exact' })
            .eq('estado', 'disponible'),
          supabase
            .from('cliente')
            .select('id_cliente', { count: 'exact' }),
          supabase
            .from('reserva')
            .select('id_reserva', { count: 'exact' })
            .eq('fecha_reserva', new Date().toISOString().split('T')[0])
        ]);

        return NextResponse.json<ApiResponse>({
          success: true,
          data: {
            informacion_general: {
              canchas_disponibles: totalCanchas?.length || 0,
              clientes_registrados: totalClientes?.length || 0,
              reservas_hoy: reservasHoy?.length || 0,
              horario_atencion: '08:00 - 22:00',
              estado_sistema: 'Operativo'
            },
            endpoints_disponibles: [
              'GET /api/external/info?tipo=canchas - Lista de canchas',
              'GET /api/external/info?tipo=deportes - Tipos de deporte',
              'GET /api/external/info?tipo=horarios - Horarios disponibles',
              'GET /api/external/info?tipo=precios - Precios por deporte',
              'POST /api/external/disponibilidad - Consultar disponibilidad',
              'POST /api/external/reservas - Crear reserva'
            ]
          }
        });
    }

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}