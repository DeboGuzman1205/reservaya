'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cancha } from '@/types';
import { PlusIcon } from '@heroicons/react/24/outline';
import CanchaForm from '@/components/canchas/CanchaForm';
import CanchasList from '@/components/canchas/CanchasList';
import { useRouter } from 'next/navigation';
import { useCanchasRealtime } from '@/lib/useRealtime';

// Importar las acciones del servidor
import { 
  obtenerCanchas, 
  crearCancha, 
  actualizarCancha, 
  eliminarCancha, 
  cambiarEstadoCancha 
} from '@/app/api/canchas/actions';

export default function CanchasPage() {
    const router = useRouter();
    const [canchas, setCanchas] = useState<Cancha[]>([]);
    const [canchaEditando, setCanchaEditando] = useState<Cancha | undefined>(undefined);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Cargar datos de canchas
    const cargarCanchas = useCallback(async () => {
        try {
            const data = await obtenerCanchas();
            setCanchas(data);
        } catch {
            setErrorMessage('Error al cargar las canchas. Intenta nuevamente.');
        }
    }, []);

    // Hook de Realtime optimizado - se actualiza automáticamente cuando hay cambios
    const { isConnected, error: realtimeError } = useCanchasRealtime(() => {
        // Recargar datos cuando hay cambios en tiempo real
        setTimeout(() => {
            cargarCanchas();
        }, 100);
    });

    // Efecto para cargar canchas al montar el componente
    useEffect(() => {
        cargarCanchas();
    }, [cargarCanchas]);

    // Manejar creación de cancha
    const handleCrearCancha = async (cancha: Omit<Cancha, 'id_cancha' | 'created_at'>) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            await crearCancha(cancha);
            setMostrarFormulario(false);
            cargarCanchas();
            router.refresh();
        } catch {
            setErrorMessage('Error al crear la cancha. Intenta nuevamente.');
                    } finally {
            setIsLoading(false);
        }
    };

    // Manejar actualización de cancha
    const handleActualizarCancha = async (cancha: Omit<Cancha, 'id_cancha' | 'created_at'>) => {
        if (!canchaEditando) return;
        
        setIsLoading(true);
        setErrorMessage('');

        try {
            await actualizarCancha(canchaEditando.id_cancha, cancha);
            setCanchaEditando(undefined);
            setMostrarFormulario(false);
            cargarCanchas();
            router.refresh();
        } catch {
            setErrorMessage('Error al actualizar la cancha. Intenta nuevamente.');
                    } finally {
            setIsLoading(false);
        }
    };

    // Manejar eliminación de cancha
    const handleEliminarCancha = async (id: number) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            await eliminarCancha(id);
            cargarCanchas();
            router.refresh();
        } catch {
            setErrorMessage('Error al eliminar la cancha. Intenta nuevamente.');
                    } finally {
            setIsLoading(false);
        }
    };

    // Manejar cambio de estado
    const handleCambiarEstado = async (id: number, estado_cancha: Cancha['estado_cancha']) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            await cambiarEstadoCancha(id, estado_cancha);
            cargarCanchas();
            router.refresh();
        } catch {
            setErrorMessage('Error al cambiar el estado de la cancha. Intenta nuevamente.');
                    } finally {
            setIsLoading(false);
        }
    };

    // Función para abrir formulario de edición
    const handleEditarCancha = (cancha: Cancha) => {
        setCanchaEditando(cancha);
        setMostrarFormulario(true);
    };

    // Función para cerrar formulario
    const handleCerrarFormulario = () => {
        setCanchaEditando(undefined);
        setMostrarFormulario(false);
    };

    // Función para manejar envío del formulario (decide entre crear o actualizar)
    const handleSubmitFormulario = async (data: Omit<Cancha, 'id_cancha' | 'created_at'>) => {
        if (canchaEditando) {
            await handleActualizarCancha(data);
        } else {
            await handleCrearCancha(data);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Indicador de estado de conexión Realtime */}
            <div className="mb-4 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                    Sincronización: {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
                {realtimeError && (
                    <span className="text-red-500 text-sm">({realtimeError})</span>
                )}
            </div>

            <div className="flex justify-between items-center mb-6">
                {!mostrarFormulario && (
                    <button
                        onClick={() => setMostrarFormulario(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Nueva Cancha
                    </button>
                )}
            </div>

            {errorMessage && (
                <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                    <p>{errorMessage}</p>
                </div>
            )}

            {isLoading && !mostrarFormulario && (
                <div className="flex justify-center items-center py-12">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="mt-4 text-gray-700">Cargando canchas...</p>
                    </div>
                </div>
            )}

            {mostrarFormulario ? (
                <CanchaForm
                    cancha={canchaEditando}
                    onSubmit={handleSubmitFormulario}
                    isSubmitting={isLoading}
                    onCancel={handleCerrarFormulario}
                />
            ) : !isLoading && (
                <CanchasList
                    canchas={canchas}
                    onEdit={handleEditarCancha}
                    onDelete={handleEliminarCancha}
                    onChangeStatus={handleCambiarEstado}
                />
            )}
        </div>
    );
}
