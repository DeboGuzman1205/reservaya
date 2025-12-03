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

// GET: Obtener chat_id de un cliente por su id_cliente
export async function GET(request: NextRequest) {
  try {
    // Validar x-api-key en headers
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.N8N_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Se requiere x-api-key en los headers' },
        { status: 401 }
      );
    }

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'x-api-key inválida' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idCliente = searchParams.get('id_cliente');

    // Validar que se proporcione el id_cliente
    if (!idCliente) {
      return NextResponse.json(
        { error: 'El parámetro id_cliente es requerido' },
        { status: 400 }
      );
    }

    // Validar que sea un número válido
    const clienteId = parseInt(idCliente);
    if (isNaN(clienteId)) {
      return NextResponse.json(
        { error: 'El id_cliente debe ser un número válido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Buscar el cliente por id_cliente y obtener solo el chat_id
    const { data: cliente, error } = await supabase
      .from('cliente')
      .select('id_cliente, chat_id, nombre, apellido')
      .eq('id_cliente', clienteId)
      .single();

    if (error) {
      console.error('Error al buscar cliente:', error);
      return NextResponse.json(
        { error: 'Error al buscar el cliente en la base de datos' },
        { status: 500 }
      );
    }

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado con el id_cliente proporcionado' },
        { status: 404 }
      );
    }

    // Retornar solo el chat_id
    return NextResponse.json({
      chat_id: cliente.chat_id
    });

  } catch (error) {
    console.error('Error interno del servidor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}