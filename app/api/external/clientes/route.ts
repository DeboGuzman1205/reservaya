import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  ApiResponse, 
  VerificarClienteRequest, 
  VerificarClienteResponse, 
  CrearClienteRequest, 
  CrearClienteResponse 
} from '@/types/api';

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

// GET: Verificar si existe un cliente por chat_id
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

    if (!chatId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El parámetro chat_id es requerido'
      }, { status: 400 });
    }


    const supabase = getSupabaseClient();

    // Buscar cliente por chat_id
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente, nombre, apellido, telefono, chat_id')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al consultar la base de datos'
      }, { status: 500 });
    }

    const response: VerificarClienteResponse = {
      existe: !!cliente,
      cliente: cliente || undefined
    };


    return NextResponse.json<ApiResponse<VerificarClienteResponse>>({
      success: true,
      data: response,
      message: cliente 
        ? `Cliente encontrado: ${cliente.nombre} ${cliente.apellido}` 
        : 'Cliente no encontrado'
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST: Crear un nuevo cliente
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'API Key no válida'
      }, { status: 401 });
    }

    const body: CrearClienteRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.chat_id || !body.nombre || !body.apellido) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Los campos chat_id, nombre y apellido son requeridos'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Verificar si ya existe un cliente con ese chat_id
    const { data: clienteExistente } = await supabase
      .from('cliente')
      .select('id_cliente, nombre, apellido')
      .eq('chat_id', body.chat_id)
      .maybeSingle();

    if (clienteExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Ya existe un cliente registrado con este chat_id: ${clienteExistente.nombre} ${clienteExistente.apellido}`
      }, { status: 409 });
    }

    // Crear el nuevo cliente
    const { data: nuevoCliente, error: clienteError } = await supabase
      .from('cliente')
      .insert({
        chat_id: body.chat_id,
        nombre: body.nombre,
        apellido: body.apellido,
        telefono: body.telefono || null
      })
      .select('id_cliente, nombre, apellido, telefono, chat_id')
      .single();

    if (clienteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al crear el cliente en la base de datos'
      }, { status: 500 });
    }


    return NextResponse.json<ApiResponse<CrearClienteResponse>>({
      success: true,
      data: nuevoCliente,
      message: `Cliente creado exitosamente: ${nuevoCliente.nombre} ${nuevoCliente.apellido}`
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// PUT: Verificar cliente por POST (método alternativo)
export async function PUT(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'API Key no válida'
      }, { status: 401 });
    }

    const body: VerificarClienteRequest = await request.json();
    
    if (!body.chat_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'El campo chat_id es requerido'
      }, { status: 400 });
    }


    const supabase = getSupabaseClient();

    // Buscar cliente por chat_id
    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente, nombre, apellido, telefono, chat_id')
      .eq('chat_id', body.chat_id)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al consultar la base de datos'
      }, { status: 500 });
    }

    const response: VerificarClienteResponse = {
      existe: !!cliente,
      cliente: cliente || undefined
    };


    return NextResponse.json<ApiResponse<VerificarClienteResponse>>({
      success: true,
      data: response,
      message: cliente 
        ? `Cliente encontrado: ${cliente.nombre} ${cliente.apellido}` 
        : 'Cliente no encontrado'
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}
