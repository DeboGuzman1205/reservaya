import { NextResponse } from 'next/server';
import { cancelarReservasPendientesVencidas } from '../actions';

// Endpoint para cancelar automáticamente reservas pendientes vencidas
export async function POST() {
  try {
    const resultado = await cancelarReservasPendientesVencidas();
    
    return NextResponse.json(resultado);
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        canceladas: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET para verificar el estado del servicio
export async function GET() {
  return NextResponse.json({
    service: 'auto-cancelar-reservas',
    status: 'active',
    description: 'Servicio para cancelar automáticamente reservas pendientes que exceden 5 minutos',
    endpoint: 'POST /api/reservas/auto-cancelar',
    funcionamiento: 'Busca reservas con estado "pendiente" cuyo created_at sea mayor a 5 minutos y las cambia a "cancelada"'
  });
}