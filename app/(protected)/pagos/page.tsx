'use client';

import { useState } from 'react';
import { usePagosRealtime, type Pago } from '@/lib/usePagosRealtime';
import PagosList from '@/components/pagos/PagosList';
import PagoModal from '@/components/pagos/PagoModal';

export default function PagosPage() {
  const { pagos, loading, error, refresh, crearPago, actualizarPago } = usePagosRealtime();
  
  const [showModal, setShowModal] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const handleAgregarPago = () => {
    setEditingPago(null);
    setShowModal(true);
  };

  const handleEditarPago = (pago: Pago) => {
    setEditingPago(pago);
    setShowModal(true);
  };

  const handleGuardarPago = async (pagoData: Omit<Pago, 'id_pago' | 'fecha_pago'>) => {
    try {
      if (editingPago) {
        // Actualizar pago existente
        await actualizarPago(editingPago.id_pago, {
          estado_pago: pagoData.estado_pago,
          mp_id: pagoData.mp_id || undefined
        });
      } else {
        // Crear nuevo pago
        await crearPago(pagoData);
      }
      setShowModal(false);
      setEditingPago(null);
    } catch (error) {
      throw error;
    }
  };

  const pagosFiltrados = pagos.filter(pago => {
    if (filtroEstado === 'todos') return true;
    return pago.estado_pago === filtroEstado;
  });

  const getEstadisticas = () => {
    const total = pagos.length;
    const completados = pagos.filter(p => p.estado_pago === 'aprobado').length;
    const pendientes = pagos.filter(p => p.estado_pago === 'pendiente').length;
    const cancelados = pagos.filter(p => p.estado_pago === 'cancelado').length;
    const desconocidos = pagos.filter(p => p.estado_pago === 'desconocido').length;
    
    const montoTotal = pagos
      .filter(p => p.estado_pago === 'aprobado')
      .reduce((sum, p) => sum + p.monto, 0);

    return { total, completados, pendientes, cancelados, desconocidos, montoTotal };
  };

  const stats = getEstadisticas();

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <h3 className="font-medium">Error al cargar pagos</h3>
          <p className="mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 bg-red-100 hover:bg-red-200 px-3 py-1 rounded text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex space-x-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Actualizar
          </button>
          <button
            onClick={handleAgregarPago}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Pago
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Monto Total
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${stats.montoTotal.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Aprobados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.completados}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pendientes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendientes}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cancelados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.cancelados}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Desconocidos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.desconocidos}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="estado-filter" className="text-sm font-medium text-gray-700">
            Filtrar por estado:
          </label>
          <select
            id="estado-filter"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="cancelado">Cancelados</option>
            <option value="desconocido">Desconocidos</option>
          </select>
          <span className="text-sm text-gray-500">
            {pagosFiltrados.length} de {pagos.length} pagos
          </span>
        </div>
      </div>

      {/* Lista de Pagos */}
      {loading && pagos.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando pagos...</p>
          </div>
        </div>
      ) : (
        <PagosList
          pagos={pagosFiltrados}
          onActualizarPago={actualizarPago}
          onEditPago={handleEditarPago}
        />
      )}

      {/* Modal */}
      <PagoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPago(null);
        }}
        onSave={handleGuardarPago}
        pago={editingPago}
        title={editingPago ? 'Editar Pago' : 'Nuevo Pago'}
      />
    </div>
  );
}
