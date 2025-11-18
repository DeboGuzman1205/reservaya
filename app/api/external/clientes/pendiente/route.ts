import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  ApiResponse, 
  VerificarClientePendienteResponse,
  CrearClientePendienteRequest,
  CrearClientePendienteResponse,
  EliminarClientePendienteRequest
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

// GET: Verificar si existe un cliente_pendiente por chat_id
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

    // Buscar cliente_pendiente por chat_id
    const { data: clientePendiente, error: clienteError } = await supabase
      .from('cliente_pendiente')
      .select('id_cliente_pendiente, chat_id, esperando, creado_en, actualizado_en')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al consultar la base de datos'
      }, { status: 500 });
    }

    const response: VerificarClientePendienteResponse = {
      existe: !!clientePendiente,
      esperando: clientePendiente?.esperando,
      cliente_pendiente: clientePendiente || undefined
    };


    return NextResponse.json<ApiResponse<VerificarClientePendienteResponse>>({
      success: true,
      data: response,
      message: clientePendiente 
        ? `Cliente pendiente encontrado. Esperando: ${clientePendiente.esperando}` 
        : 'Cliente pendiente no encontrado'
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST: Crear un nuevo cliente_pendiente
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    if (!validateApiKey(request)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'API Key no válida'
      }, { status: 401 });
    }

    const body: CrearClientePendienteRequest = await request.json();
    
    // Validar campos requeridos
    if (!body.chat_id || !body.esperando) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Los campos chat_id y esperando son requeridos'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Verificar si ya existe un cliente_pendiente con ese chat_id
    const { data: clienteExistente } = await supabase
      .from('cliente_pendiente')
      .select('id_cliente_pendiente, esperando')
      .eq('chat_id', body.chat_id)
      .maybeSingle();

    if (clienteExistente) {
      
      // Actualizar el registro existente en lugar de crear uno nuevo
      const { data: clienteActualizado, error: updateError } = await supabase
        .from('cliente_pendiente')
        .update({
          esperando: body.esperando,
          actualizado_en: new Date().toISOString()
        })
        .eq('chat_id', body.chat_id)
        .select('id_cliente_pendiente, chat_id, esperando, creado_en, actualizado_en')
        .single();

      if (updateError) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Error al actualizar el cliente pendiente en la base de datos'
        }, { status: 500 });
      }


      return NextResponse.json<ApiResponse<CrearClientePendienteResponse>>({
        success: true,
        data: clienteActualizado,
        message: `Cliente pendiente actualizado. Ahora esperando: ${clienteActualizado.esperando}`
      });
    }

    // Crear el nuevo cliente_pendiente
    const { data: nuevoClientePendiente, error: clienteError } = await supabase
      .from('cliente_pendiente')
      .insert({
        chat_id: body.chat_id,
        esperando: body.esperando
      })
      .select('id_cliente_pendiente, chat_id, esperando, creado_en, actualizado_en')
      .single();

    if (clienteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al crear el cliente pendiente en la base de datos'
      }, { status: 500 });
    }


    return NextResponse.json<ApiResponse<CrearClientePendienteResponse>>({
      success: true,
      data: nuevoClientePendiente,
      message: `Cliente pendiente creado. Esperando: ${nuevoClientePendiente.esperando}`
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// DELETE: Eliminar cliente_pendiente por chat_id
export async function DELETE(request: NextRequest) {
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
      // Si no hay parámetro en URL, intentar obtenerlo del body
      try {
        const body: EliminarClientePendienteRequest = await request.json();
        if (!body.chat_id) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'El parámetro chat_id es requerido'
          }, { status: 400 });
        }
        
        
        const supabase = getSupabaseClient();

        // Verificar si existe antes de eliminar
        const { data: clienteExistente } = await supabase
          .from('cliente_pendiente')
          .select('id_cliente_pendiente, esperando')
          .eq('chat_id', body.chat_id)
          .maybeSingle();

        if (!clienteExistente) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Cliente pendiente no encontrado'
          }, { status: 404 });
        }

        // Eliminar el cliente_pendiente
        const { error: deleteError } = await supabase
          .from('cliente_pendiente')
          .delete()
          .eq('chat_id', body.chat_id);

        if (deleteError) {
          return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Error al eliminar el cliente pendiente de la base de datos'
          }, { status: 500 });
        }


        return NextResponse.json<ApiResponse>({
          success: true,
          message: `Cliente pendiente eliminado exitosamente`
        });
        
      } catch {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'El parámetro chat_id es requerido (en URL o JSON body)'
        }, { status: 400 });
      }
    }


    const supabase = getSupabaseClient();

    // Verificar si existe antes de eliminar
    const { data: clienteExistente } = await supabase
      .from('cliente_pendiente')
      .select('id_cliente_pendiente, esperando')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (!clienteExistente) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cliente pendiente no encontrado'
      }, { status: 404 });
    }


    // Eliminar el cliente_pendiente
    const { error: deleteError } = await supabase
      .from('cliente_pendiente')
      .delete()
      .eq('chat_id', chatId);

    if (deleteError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error al eliminar el cliente pendiente de la base de datos'
      }, { status: 500 });
    }


    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Cliente pendiente eliminado exitosamente`
    });

  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}
