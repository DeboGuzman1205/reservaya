'use client';

import { useState } from 'react';
import { Cancha } from '@/types';
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import DetallesCanchaModal from './DetallesCanchaModal';

interface CanchasListProps {
  canchas: Cancha[];
  onEdit: (cancha: Cancha) => void;
  onDelete: (id: number) => void;
  onChangeStatus: (id: number, status: Cancha['estado_cancha']) => void;
}

export default function CanchasList({ 
  canchas, 
  onEdit, 
  onDelete,
  onChangeStatus
}: CanchasListProps) {
  const [canchaAEliminar, setCanchaAEliminar] = useState<number | null>(null);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<Cancha | null>(null);
  const [modalDetallesAbierto, setModalDetallesAbierto] = useState(false);
  
  // Función para obtener color según estado
  const getEstadoColor = (estado: Cancha['estado_cancha']) => {
    switch (estado) {
      case 'disponible': return 'bg-green-100 text-green-800';
      case 'no disponible': return 'bg-red-100 text-red-800';
      case 'mantenimiento': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Función para obtener ícono según estado
  const getEstadoIcon = (estado: Cancha['estado_cancha']) => {
    switch (estado) {
      case 'disponible': return <CheckCircleIcon className="h-5 w-5" />;
      case 'no disponible': return <XCircleIcon className="h-5 w-5" />;
      case 'mantenimiento': return <ExclamationCircleIcon className="h-5 w-5" />;
      default: return null;
    }
  };
  
  // Función para formatear el estado de la cancha para mostrar
  const formatearEstadoCancha = (estado: Cancha['estado_cancha']) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'no disponible': return 'No disponible';
      case 'mantenimiento': return 'Mantenimiento';
      default: return estado || '';
    }
  };
  
  // Diálogo de confirmación para eliminar cancha
  const ConfirmDeleteDialog = ({ id, nombre_cancha }: { id: number, nombre_cancha: string }) => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">Confirmar eliminación</h3>
        <p className="text-gray-600 mb-6">
          ¿Estás seguro de que deseas eliminar la cancha <span className="font-semibold">{nombre_cancha}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setCanchaAEliminar(null)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onDelete(id);
              setCanchaAEliminar(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
  
  if (canchas.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow">
        <p className="text-gray-600">No hay canchas registradas. Agrega una cancha para comenzar.</p>
      </div>
    );
  }
  
  return (
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
              Tipo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Disponibilidad
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tarifa/Hora
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {canchas.map((cancha) => (
            <tr key={cancha.id_cancha}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {cancha.id_cancha}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {cancha.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {cancha.tipo} VS {cancha.tipo}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {cancha.disponibilidad_horaria}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(cancha.estado_cancha)}`}>
                  <span className="mr-1">
                    {getEstadoIcon(cancha.estado_cancha)}
                  </span>
                  {formatearEstadoCancha(cancha.estado_cancha)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${cancha.tarifa_hora.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-3">
                  {/* Botón de cambio de estado - menú desplegable */}
                  <div className="relative inline-block text-left">
                    <select
                      className="border border-gray-300 text-xs rounded-md py-1 px-2 bg-white hover:bg-gray-50"
                      value={cancha.estado_cancha}
                      onChange={(e) => onChangeStatus(cancha.id_cancha, e.target.value as Cancha['estado_cancha'])}
                    >
                      <option value="disponible">Disponible</option>
                      <option value="no disponible">No disponible</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                  
                  {/* Botón para ver detalles */}
                  <button
                    onClick={() => {
                      setCanchaSeleccionada(cancha);
                      setModalDetallesAbierto(true);
                    }}
                    className="text-gray-600 hover:text-gray-900"
                    title="Ver detalles"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  
                  {/* Botón de editar */}
                  <button
                    onClick={() => onEdit(cancha)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Editar cancha"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  
                  {/* Botón de eliminar */}
                  <button
                    onClick={() => setCanchaAEliminar(cancha.id_cancha)}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar cancha"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Diálogo de confirmación para eliminar */}
      {canchaAEliminar && (
        <ConfirmDeleteDialog 
          id={canchaAEliminar} 
          nombre_cancha={canchas.find(c => c.id_cancha === canchaAEliminar)?.nombre_cancha || 'la cancha seleccionada'} 
        />
      )}
      
      {/* Modal de detalles */}
      <DetallesCanchaModal 
        cancha={canchaSeleccionada}
        isOpen={modalDetallesAbierto}
        onClose={() => {
          setModalDetallesAbierto(false);
          setCanchaSeleccionada(null);
        }}
      />
    </div>
  );
}