'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Cliente } from '@/types';

/**
 * Obtiene todos los clientes de la base de datos
 */
export async function obtenerClientes() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .order('id_cliente', { ascending: true });
  
  if (error) {
    throw new Error('No se pudieron cargar los clientes');
  }
  
  return data || [];
}

/**
 * Obtiene un cliente por su ID
 */
export async function obtenerClientePorId(id: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .eq('id_cliente', id)
    .single();
  
  if (error) {
    throw new Error('No se pudo encontrar el cliente');
  }
  
  return data;
}

/**
 * Crea un nuevo cliente
 */
export async function crearCliente(cliente: Omit<Cliente, 'id_cliente' | 'fecha_registro'>) {
  const supabase = createServerComponentClient({ cookies });
  
  // Agregar la fecha de registro actual
  const clienteConFecha = {
    ...cliente,
    fecha_registro: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('cliente')
    .insert([clienteConFecha])
    .select();
  
  if (error) {
    throw new Error('No se pudo crear el cliente');
  }
  
  return data?.[0];
}

/**
 * Actualiza un cliente existente
 */
export async function actualizarCliente(id: number, cliente: Partial<Omit<Cliente, 'id_cliente' | 'fecha_registro'>>) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cliente')
    .update(cliente)
    .eq('id_cliente', id)
    .select();
  
  if (error) {
    throw new Error('No se pudo actualizar el cliente');
  }
  
  return data?.[0];
}

/**
 * Elimina un cliente por su ID
 */
export async function eliminarCliente(id: number) {
  const supabase = createServerComponentClient({ cookies });
  
  const { error } = await supabase
    .from('cliente')
    .delete()
    .eq('id_cliente', id);
  
  if (error) {
    throw new Error('No se pudo eliminar el cliente');
  }
  
  return true;
}

/**
 * Busca clientes por nombre o apellido
 */
export async function buscarClientes(query: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,telefono.ilike.%${query}%`)
    .order('apellido', { ascending: true });
  
  if (error) {
    throw new Error('No se pudieron buscar los clientes');
  }
  
  return data || [];
}

