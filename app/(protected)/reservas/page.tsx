'use client';

import { useState, useEffect, useCallback } from 'react';
import { Reserva, Cliente, Cancha } from '@/types';
import { PlusIcon } from '@heroicons/react/24/outline';
import ReservaForm from '@/components/reservas/ReservaForm';
import ReservasList from '@/components/reservas/ReservasList';
import { useRealtimeReservas, useCanchasRealtime } from '@/lib/useRealtime';
import { useRouter } from 'next/navigation';

// Importar las acciones del servidor
import { 
  obtenerReservas,
  crearReserva,
  actualizarReserva,
  eliminarReserva,
  cambiarEstadoReserva,

  obtenerClientesActivos,
  obtenerCanchasDisponibles,
  verificarBaseDatos
} from '@/app/api/reservas/actions';

export default function ReservasPage() {
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [reservaEditando, setReservaEditando] = useState<Reserva | undefined>(undefined);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar datos al inicio
  const cargarDatos = useCallback(async () => {
      setErrorMessage('');
      
      try {
        // Primero verificar la base de datos

        const dbStatus = await verificarBaseDatos();
        
        if (!dbStatus.success) {
          setErrorMessage(`Error de conexión a la base de datos: ${dbStatus.error}. Por favor, verifica que las tablas estén creadas correctamente.`);
          return;
        }
        

        
        // Mostrar diagnóstico detallado
        if (dbStatus.data) {
          const diagnosticos = [];
          
          if (!dbStatus.data.cliente.existe) {
            diagnosticos.push(`❌ Tabla 'cliente' no disponible: ${dbStatus.data.cliente.error}`);
          } else {
            diagnosticos.push(`✅ Tabla 'cliente' encontrada con columnas: ${dbStatus.data.cliente.estructura?.join(', ')}`);
          }
          
          if (!dbStatus.data.reserva.existe) {
            diagnosticos.push(`❌ Tabla 'reserva' no disponible: ${dbStatus.data.reserva.error}`);
          } else {
            diagnosticos.push(`✅ Tabla 'reserva' encontrada con columnas: ${dbStatus.data.reserva.estructura?.join(', ')}`);
          }
          
          if (!dbStatus.data.cancha.existe) {
            diagnosticos.push(`❌ Tabla 'cancha' no disponible: ${dbStatus.data.cancha.error}`);
          } else {
            diagnosticos.push(`✅ Tabla 'cancha' encontrada con columnas: ${dbStatus.data.cancha.estructura?.join(', ')}`);
          }
          

        }
        

        
        // Cargar los clientes activos, reservas y canchas
        const [clientesData, reservasData, canchasData] = await Promise.all([
          obtenerClientesActivos().catch(error => {
                        setErrorMessage('Error al cargar clientes: ' + error.message);
            return [];
          }),
          obtenerReservas().catch(error => {
                        setErrorMessage('Error al cargar reservas: ' + error.message);
            return [];
          }),
          obtenerCanchasDisponibles().catch(error => {
                        setErrorMessage('Error al cargar canchas: ' + error.message);
            return [];
          })
        ]);

        setClientes(clientesData);
        setReservas(reservasData);
        setCanchas(canchasData);
        

      } catch (error) {
        setErrorMessage('Error al cargar los datos: ' + (error as Error).message);
      }
  }, []);

  // Hooks de Realtime optimizados
  const { isConnected: reservasConnected, error: reservasError } = useRealtimeReservas(() => {
    setTimeout(() => {
      cargarDatos();
    }, 100);
  });

  const { isConnected: canchasConnected } = useCanchasRealtime(() => {
    setTimeout(() => {
      cargarDatos();
    }, 100);
  });

  // Efecto para cargar datos al inicio
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSubmitReserva = async (reserva: Omit<Reserva, 'id_reserva'>) => {
    try {
      setErrorMessage('');
      
      if (reservaEditando) {
        await actualizarReserva(reservaEditando.id_reserva, reserva);
      } else {
        await crearReserva(reserva);
      }
      
      // Recargar las reservas
      const nuevasReservas = await obtenerReservas();
      setReservas(nuevasReservas);
      
      setMostrarFormulario(false);
      setReservaEditando(undefined);
      router.refresh();
    } catch (error) {
            setErrorMessage((error as Error).message || 'Error al procesar la reserva');
    }
  };

  // Manejar creación de nuevo cliente
  const handleClienteCreado = (nuevoCliente: Cliente) => {
    // Agregar el nuevo cliente a la lista existente
    setClientes(prevClientes => [...prevClientes, nuevoCliente]);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Indicador de estado de conexión Realtime */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${reservasConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            Reservas: {reservasConnected ? 'Conectado' : 'Desconectado'}
          </span>
          {reservasError && (
            <span className="text-red-500 text-xs">({reservasError})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${canchasConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            Canchas: {canchasConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        {!mostrarFormulario && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Reserva
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{errorMessage}</p>
        </div>
      )}

      {mostrarFormulario ? (
        <ReservaForm
          reserva={reservaEditando}
          clientes={clientes}
          canchas={canchas}
          onSubmit={handleSubmitReserva}
          isSubmitting={false}
          onClienteCreado={handleClienteCreado}
          onCancel={() => {
            setReservaEditando(undefined);
            setMostrarFormulario(false);
          }}
        />
      ) : (
        <ReservasList
          reservas={reservas}
          onEdit={(reserva) => {
            setReservaEditando(reserva);
            setMostrarFormulario(true);
          }}
          onDelete={async (id) => {
            try {
              await eliminarReserva(id);
              const nuevasReservas = await obtenerReservas();
              setReservas(nuevasReservas);
              router.refresh();
            } catch {
                            setErrorMessage('Error al eliminar la reserva');
            }
          }}

          onCambiarEstado={async (id: number, estado: string) => {
            try {
              await cambiarEstadoReserva(id, estado);
              const nuevasReservas = await obtenerReservas();
              setReservas(nuevasReservas);
              router.refresh();
            } catch {
                            setErrorMessage('Error al cambiar el estado de la reserva');
            }
          }}
        />
      )}
    </div>
  );
}
