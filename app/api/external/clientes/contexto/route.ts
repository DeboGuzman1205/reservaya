import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ============================================================
   🔧 CONFIGURACIÓN SUPABASE
============================================================ */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de entorno de Supabase");
  return createClient(url, key);
}

/* ============================================================
   📋 TIPOS
============================================================ */
interface UserContextBody {
  chat_id: string;
  fecha?: string | null;
  hora_inicio?: string | null;
  tipo_cancha?: string | null;
  cancha_nro?: string | number | null;
  accion_pendiente?: string | null;
}

/* ============================================================
   🧽 LIMPIADOR DE VALORES VACÍOS
============================================================ */
function cleanValue<T>(value: T): T | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/* ============================================================
   🧩 GET — Obtener contexto por chat_id
============================================================ */
export async function GET(request: NextRequest) {
  try {
    const chatId = new URL(request.url).searchParams.get("chat_id");

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "chat_id requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("user_context")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data ?? null,
      message: data ? "Contexto encontrado" : "Sin contexto previo",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

/* ============================================================
   🧩 POST — Crear o actualizar contexto (UPSERT)
============================================================ */
export async function POST(request: NextRequest) {
  try {
    const body: UserContextBody = await request.json();

    if (!body.chat_id) {
      return NextResponse.json(
        { success: false, error: "chat_id es requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 🧹 Limpiar los campos antes de enviar a Supabase
    const fecha = cleanValue(body.fecha);
    const hora_inicio = cleanValue(body.hora_inicio);
    const tipo_cancha = cleanValue(body.tipo_cancha);
    const cancha_nro =
      body.cancha_nro && body.cancha_nro !== ""
        ? Number(body.cancha_nro)
        : null;
    const accion_pendiente = cleanValue(body.accion_pendiente);

    const { data, error } = await supabase
      .from("user_context")
      .upsert(
        {
          chat_id: body.chat_id,
          fecha,
          hora_inicio,
          tipo_cancha,
          cancha_nro,
          accion_pendiente,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chat_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

/* ============================================================
   🧩 DELETE — Eliminar contexto por chat_id
============================================================ */
export async function DELETE(request: NextRequest) {
  try {
    const chatId = new URL(request.url).searchParams.get("chat_id");

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "chat_id requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from("user_context").delete().eq("chat_id", chatId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Contexto eliminado exitosamente" });
  } catch {
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
