import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse, DisponibilidadCanchaResponse, ConsultaDisponibilidadRequest } from '@/types/api';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  return apiKey === process.env.N8N_API_KEY;
}

async function obtenerDisponibilidadCanchas(fecha: string, canchaId?: number, tipo?: string, horaInicio?: string) {
  const supabase = getSupabaseClient();
  
  try {
    let canchasQuery = supabase
      .from('cancha')
      .select('id_cancha, nombre, tipo, disponibilidad_horaria, estado_cancha, tarifa_hora')
      .eq('estado_cancha', 'disponible');
    
    if (canchaId) {
      canchasQuery = canchasQuery.eq('id_cancha', canchaId);
    }
    
    if (tipo) {
      canchasQuery = canchasQuery.eq('tipo', tipo);
    }
    
    const { data: canchas, error: canchasError } = await canchasQuery;
    
    if (canchasError) {
      throw new Error('Error al consultar canchas');
  	}

  	if (!canchas || canchas.length === 0) {
  	  return [];
  	}

  	const disponibilidadPromises = canchas.map(async (cancha: {
  	  id_cancha: number;
  	  nombre: string;
  	  tipo: string;
  	  disponibilidad_horaria: string | null;
  	  estado_cancha: string;
  	  tarifa_hora: number;
  	}) => {
  	  const { data: reservas, error: reservasError } = await supabase
  	 	 .from('reserva')
  	 	 .select('hora_inicio, hora_fin, estado_reserva, id_cliente')
  	 	 .eq('id_cancha', cancha.id_cancha)
  	 	 .eq('fecha_reserva', fecha)
  	 	 .in('estado_reserva', ['confirmada', 'pendiente']);

  	  if (reservasError) {
  	 	 throw new Error(`Error al consultar reservas para cancha ${cancha.id_cancha}`);
  	  }

  	  const clienteIds = [...new Set((reservas || []).map((r: { id_cliente: number }) => r.id_cliente).filter(Boolean))];
  	  let clientesMap = new Map<number, string>();
  	  
  	  if (clienteIds.length > 0) {
  	 	 const { data: clientes } = await supabase
  	 	 	 .from('cliente')
  	 	 	 .select('id_cliente, nombre')
  	 	 	 .in('id_cliente', clienteIds);

  	 	 clientesMap = new Map(
  	 	 	 (clientes || []).map((c: { id_cliente: number; nombre: string }) => [c.id_cliente, c.nombre])
  	 	 );
  	  }

  	  let horariosCompletos: string[] = [];
  	  for (let hora = 8; hora <= 23; hora++) {
  	 	 horariosCompletos.push(`${hora.toString().padStart(2, '0')}:00`);
  	  }
  	  horariosCompletos.push('00:00');
  	  
  	  const ahora = new Date();
  	  const ahoraArgentina = new Date(ahora.getTime() - (3 * 60 * 60 * 1000));
  	  const [year, month, day] = fecha.split('-').map(Number);
  	  const fechaConsulta = new Date(year, month - 1, day);
  	  const esHoy = fechaConsulta.toDateString() === ahoraArgentina.toDateString();
  	  
  	  if (esHoy) {
  	 	 const proximaHora = ahoraArgentina.getHours() + 1;
  	 	 horariosCompletos = horariosCompletos.filter(horario => {
  	 	 	 const [hora] = horario.split(':').map(Number);
  	 	 	 const horaSlot = (hora === 0) ? 24 : hora;
  	 	 	 return horaSlot >= proximaHora;
  	 	 });
  	  }

  	  const horariosOcupados = (reservas || []).map((reserva: {
  	 	 hora_inicio: string;
  	 	 hora_fin: string;
  	 	 id_cliente: number;
  	  }) => ({
  	 	 hora_inicio: reserva.hora_inicio,
  	 	 hora_fin: reserva.hora_fin,
  	 	 cliente: clientesMap.get(reserva.id_cliente) || 'Cliente no identificado'
  	  }));
  	  
  	  const horariosDisponibles = horariosCompletos.filter(horario => {
  	 	 const horaSlot = parseInt(horario.split(':')[0]);
  	 	 
  	 	 const estaOcupado = (reservas || []).some((reserva: {
  	 	 	 hora_inicio: string;
  	 	 	 hora_fin: string;
  	 	 }) => {
  	 	 	 const horaInicioReserva = parseInt(reserva.hora_inicio.split(':')[0]);
  	 	 	 let horaFinReserva = parseInt(reserva.hora_fin.split(':')[0]);

          if (horaFinReserva === 0) {
            horaFinReserva = 24;
          }
  	 	 	 
  	 	 	 return horaSlot >= horaInicioReserva && horaSlot < horaFinReserva;
  	 	 });
  	 	 
  	 	 return !estaOcupado;
  	  });

  	  if (horaInicio) {
  	 	 const horaDisponible = horariosDisponibles.includes(horaInicio);
  	 	 if (!horaDisponible) {
  	 	 	 return null;
  	 	 }
  	 	 return {
  	 	 	 id_cancha: cancha.id_cancha,
  	 	 	 nombre: cancha.nombre,
  	 	 	 tipo: cancha.tipo,
  	 	 	 precio_hora: cancha.tarifa_hora,
  	 	 	 estado: cancha.estado_cancha,
  	 	 	 horariosDisponibles: [horaInicio],
  	 	 	 horariosOcupados
  	 	 } as DisponibilidadCanchaResponse;
  	  }

  	  return {
  	 	 id_cancha: cancha.id_cancha,
  	 	 nombre: cancha.nombre,
  	 	 tipo: cancha.tipo,
  	 	 precio_hora: cancha.tarifa_hora,
  	 	 estado: cancha.estado_cancha,
  	 	 horariosDisponibles,
  	 	 horariosOcupados
  	  } as DisponibilidadCanchaResponse;
  	});

  	const disponibilidad = await Promise.all(disponibilidadPromises);
  	return disponibilidad.filter((cancha): cancha is DisponibilidadCanchaResponse => cancha !== null);

  } catch (error) {
  	throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
  	if (!validateApiKey(request)) {
  	  return NextResponse.json<ApiResponse>({
  	 	 success: false,
  	 	 error: 'API Key no válida'
  	  }, { status: 401 });
  	}

  	const { searchParams } = new URL(request.url);
  	const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
  	const canchaId = searchParams.get('cancha_id');
  	const tipo = searchParams.get('tipo');
  	const horaInicio = searchParams.get('hora_inicio');

  	const disponibilidad = await obtenerDisponibilidadCanchas(
  	  fecha,
  	  canchaId ? parseInt(canchaId) : undefined,
  	  tipo || undefined,
  	  horaInicio || undefined
  	);

  	return NextResponse.json<ApiResponse<DisponibilidadCanchaResponse[]>>({
  	  success: true,
  	  data: disponibilidad,
  	  message: `Disponibilidad para el ${fecha}`
  	});

  } catch (error) {
  	return NextResponse.json<ApiResponse>({
  	  success: false,
  	  error: error instanceof Error ? error.message : 'Error interno del servidor'
  	}, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
  	if (!validateApiKey(request)) {
  	  return NextResponse.json<ApiResponse>({
  	 	 success: false,
  	 	 error: 'API Key no válida'
  	  }, { status: 401 });
  	}

  	const body: ConsultaDisponibilidadRequest = await request.json();
  	const fecha = body.fecha || new Date().toISOString().split('T')[0];

  	const disponibilidad = await obtenerDisponibilidadCanchas(
  	  fecha,
  	  body.cancha_id,
  	  body.tipo,
  	  body.hora_inicio
  	);

  	return NextResponse.json<ApiResponse<DisponibilidadCanchaResponse[]>>({
  	  success: true,
  	  data: disponibilidad,
  	  message: `Disponibilidad para el ${fecha}`
  	});

  } catch (error) {
  	return NextResponse.json<ApiResponse>({
  	  success: false,
  	  error: error instanceof Error ? error.message : 'Error interno del servidor'
  	}, { status: 500 });
  }
}