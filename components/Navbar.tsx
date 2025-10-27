'use client';

import React, { useState } from 'react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useSupabaseClient();

  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  
  // Función para cerrar sesión
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {

    } finally {
      setIsLoading(false);
    }
  };

  // Determinar el título basado en la ruta actual si no se proporciona uno
  const getTitle = () => {
    if (title) return title;
    
    if (pathname.includes('/dashboard')) return 'Panel del Control';
    if (pathname.includes('/canchas')) return 'Gestión de Canchas';
    if (pathname.includes('/reservas')) return 'Gestión de Reservas';
    if (pathname.includes('/clientes')) return 'Gestión de Clientes';
    if (pathname.includes('/pagos')) return 'Gestión de Pagos';
    
    return 'ReservaYA';
  };

  return (
    <div className="h-16 px-8 border-b border-gray-200 flex items-center justify-between bg-white">
      <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
      
      <div className="flex items-center gap-4">
        {pathname.includes('/canchas') && (
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar canchas..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        )}

        <div className="relative">
          <button className="relative p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            <Image 
              src="/user-avatar.svg"
              alt="Profile" 
              width={36}
              height={36}
              className="h-full w-full object-cover text-gray-500"
            />
          </div>
          
          {user && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
              <button 
                onClick={handleSignOut}
                disabled={isLoading}
                className="text-xs text-red-600 hover:text-red-800"
              >
                {isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}