'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Cancha } from '@/types';

/**
 * Obtiene todas las canchas de la base de datos
 */
export async function obtenerCanchas() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cancha')
    .select('*')
    .order('id_cancha', { ascending: true });
  
  if (error) {
    throw new Error('No se pudieron cargar las canchas');
  }
  
  return data || [];
}

/**
 * Obtiene una cancha por su ID
 */
export async function obtenerCanchaPorId(id: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cancha')
    .select('*')
    .eq('id_cancha', id)
    .single();
  
  if (error) {
    throw new Error('No se pudo encontrar la cancha');
  }
  
  return data;
}

/**
 * Crea una nueva cancha
 */
export async function crearCancha(cancha: Omit<Cancha, 'id_cancha' | 'created_at'>) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cancha')
    .insert([cancha])
    .select();
  
  if (error) {
    throw new Error('No se pudo crear la cancha');
  }
  
  return data?.[0];
}

/**
 * Actualiza una cancha existente
 */
export async function actualizarCancha(id: number, cancha: Partial<Omit<Cancha, 'id_cancha' | 'created_at'>>) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cancha')
    .update(cancha)
    .eq('id_cancha', id)
    .select();
  
  if (error) {
    throw new Error('No se pudo actualizar la cancha');
  }
  
  return data?.[0];
}

/**
 * Elimina una cancha por su ID
 */
export async function eliminarCancha(id: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const { error } = await supabase
    .from('cancha')
    .delete()
    .eq('id_cancha', id);
  
  if (error) {
    throw new Error('No se pudo eliminar la cancha');
  }
  
  return true;
}

/**
 * Cambia el estado de una cancha
 */
export async function cambiarEstadoCancha(id: number, estado_cancha: Cancha['estado_cancha']) {
  return actualizarCancha(id, { estado_cancha });
}