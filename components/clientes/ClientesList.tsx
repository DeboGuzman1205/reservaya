'use client';

import { useState } from 'react';
import { Cliente } from '@/types';
import { 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import DetallesClienteModal from './DetallesClienteModal';

interface ClientesListProps {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
}

export default function ClientesList({ 
  clientes, 
  onEdit, 
  onDelete,
  onSearch
}: ClientesListProps) {
  const [clienteAEliminar, setClienteAEliminar] = useState<number | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [modalDetallesAbierto, setModalDetallesAbierto] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Función para formatear la fecha
  const formatearFecha = (fechaISO?: string) => {
    if (!fechaISO) return 'No disponible';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  

  
  // Diálogo de confirmación para eliminar cliente
  const ConfirmDeleteDialog = ({ id, nombre, apellido }: { id: number, nombre: string, apellido: string }) => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">Confirmar eliminación</h3>
        <p className="text-gray-600 mb-6">
          ¿Estás seguro de que deseas eliminar el cliente <span className="font-semibold">{nombre} {apellido}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setClienteAEliminar(null)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onDelete(id);
              setClienteAEliminar(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );

  // Estado para rastrear si estamos en modo búsqueda
  const [isSearching, setIsSearching] = useState(false);

  // Función para manejar la búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(searchQuery.trim() !== '');
    onSearch(searchQuery);
  };

  // Función para limpiar la búsqueda y volver a la lista completa
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    onSearch('');
  };

if (clientes.length === 0) {
  return (
    <div className="text-center py-10 bg-white rounded-lg shadow">
      {isSearching ? (
        <>
          <p className="text-gray-600 mb-4">No se encontró ninguna coincidencia de la búsqueda.</p>
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver a la lista completa
          </button>
        </>
      ) : (
        <>
          <p className="text-gray-600">No hay clientes registrados. Agrega un cliente para comenzar.</p>
        </>
      )}
    </div>
  );
}

  
  return (
    <>
      {/* Barra de búsqueda */}
      <form onSubmit={handleSearch} className="mb-6 flex">
        <div className="relative flex-grow">
          <input
            type="text"
            className="w-full p-3 pl-10 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre, apellido o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </span>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-r-none border-r border-blue-700 hover:bg-blue-700"
        >
          Buscar
        </button>
        {isSearching && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-4 py-2 bg-gray-600 text-white rounded-r hover:bg-gray-700"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Tabla de clientes */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apellido
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registro
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientes.map((cliente) => (
              <tr key={cliente.id_cliente} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {cliente.id_cliente}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cliente.nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cliente.apellido}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cliente.telefono}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatearFecha(cliente.fecha_registro)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-3">
                    {/* Botón para ver detalles */}
                    <button
                      onClick={() => {
                        setClienteSeleccionado(cliente);
                        setModalDetallesAbierto(true);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                      title="Ver detalles"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Botón de editar */}
                    <button
                      onClick={() => onEdit(cliente)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar cliente"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Botón de eliminar */}
                    <button
                      onClick={() => setClienteAEliminar(cliente.id_cliente)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar cliente"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Diálogo de confirmación para eliminar */}
      {clienteAEliminar && (
        <ConfirmDeleteDialog 
          id={clienteAEliminar} 
          nombre={clientes.find(c => c.id_cliente === clienteAEliminar)?.nombre || 'el cliente seleccionado'} 
          apellido={clientes.find(c => c.id_cliente === clienteAEliminar)?.apellido || ''} 
        />
      )}
      
      {/* Modal de detalles */}
      <DetallesClienteModal 
        cliente={clienteSeleccionado}
        isOpen={modalDetallesAbierto}
        onClose={() => {
          setModalDetallesAbierto(false);
          setClienteSeleccionado(null);
        }}
      />
    </>
  );
}