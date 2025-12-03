import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET - Obtener todos los pagos
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: pagos, error } = await supabase
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

    if (error) {
      return NextResponse.json({ error: 'Error al obtener los pagos' }, { status: 500 });
    }

    return NextResponse.json(pagos);
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear nuevo pago
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_reserva, monto, estado_pago, mp_id } = body;

    // Validaciones
    if (!id_reserva || !monto || !estado_pago) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: id_reserva, monto, estado_pago' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar que la reserva existe y obtener su estado actual
    const { data: reserva, error: reservaError } = await supabase
      .from('reserva')
      .select('id_reserva, estado_reserva')
      .eq('id_reserva', id_reserva)
      .single();

    if (reservaError || !reserva) {
      return NextResponse.json(
        { error: 'La reserva especificada no existe' },
        { status: 404 }
      );
    }

    const { data: pago, error: pagoError } = await supabase
      .from('pago')
      .insert({
        id_reserva,
        monto,
        estado_pago,
        mp_id: mp_id || null,
        fecha_pago: new Date().toISOString()
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

    if (pagoError) {
      return NextResponse.json({ error: 'Error al crear el pago' }, { status: 500 });
    }


    if (reserva.estado_reserva === 'pendiente') {
      const { error: updateError } = await supabase
        .from('reserva')
        .update({ estado_reserva: 'confirmada' })
        .eq('id_reserva', id_reserva);

      if (updateError) {
        // Pago creado exitosamente, error en actualización de reserva es secundario
      }
    }

    return NextResponse.json(pago);
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar estado de pago
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_pago, estado_pago, mp_id } = body;

    if (!id_pago || !estado_pago) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: id_pago, estado_pago' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const updateData: {estado_pago: string; mp_id?: string | null} = { estado_pago };
    if (mp_id !== undefined) {
      updateData.mp_id = mp_id;
    }

    const { data: pago, error } = await supabase
      .from('pago')
      .update(updateData)
      .eq('id_pago', id_pago)
      .select(`
        id_pago,
        id_reserva,
        monto,
        estado_pago,
        mp_id,
        fecha_pago
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar el pago' }, { status: 500 });
    }

    return NextResponse.json(pago);
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
