'use client';

import { useState, useEffect } from 'react';
import { Cliente } from '@/types';
import { PlusIcon } from '@heroicons/react/24/outline';
import ClienteForm from '@/components/clientes/ClienteForm';
import ClientesList from '@/components/clientes/ClientesList';
import { useRouter } from 'next/navigation';

// Importar las acciones del servidor
import { 
  obtenerClientes, 
  crearCliente, 
  actualizarCliente, 
  eliminarCliente,
  buscarClientes
} from '@/app/api/clientes/actions';

export default function ClientesPage() {
    const router = useRouter();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteEditando, setClienteEditando] = useState<Cliente | undefined>(undefined);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Cargar datos de clientes
    const cargarClientes = async () => {
        try {
            const data = await obtenerClientes();
            setClientes(data);
        } catch (error) {
            setErrorMessage('Error al cargar los clientes. Intenta nuevamente.');
            console.error('Error al cargar clientes:', error);
        }
    };

    // Efecto para cargar clientes al montar el componente
    useEffect(() => {
        cargarClientes();
    }, []);

    // Manejar creación de cliente
    const handleCrearCliente = async (cliente: Omit<Cliente, 'id_cliente' | 'fecha_registro'>) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            await crearCliente(cliente);
            setMostrarFormulario(false);
            cargarClientes();
            router.refresh();
        } catch (error) {
            setErrorMessage('Error al crear el cliente. Intenta nuevamente.');
            console.error('Error al crear cliente:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar actualización de cliente
    const handleActualizarCliente = async (cliente: Omit<Cliente, 'id_cliente' | 'fecha_registro'>) => {
        if (!clienteEditando) return;
        
        setIsLoading(true);
        setErrorMessage('');

        try {
            await actualizarCliente(clienteEditando.id_cliente, cliente);
            setClienteEditando(undefined);
            setMostrarFormulario(false);
            cargarClientes();
            router.refresh();
        } catch (error) {
            setErrorMessage('Error al actualizar el cliente. Intenta nuevamente.');
            console.error('Error al actualizar cliente:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar eliminación de cliente
    const handleEliminarCliente = async (id: number) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            await eliminarCliente(id);
            cargarClientes();
            router.refresh();
        } catch (error) {
            setErrorMessage('Error al eliminar el cliente. Intenta nuevamente.');
            console.error('Error al eliminar cliente:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Función para buscar clientes
    const handleBuscarClientes = async (query: string) => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            if (query.trim() === '') {
                await cargarClientes();
            } else {
                const resultados = await buscarClientes(query);
                setClientes(resultados);
            }
        } catch (error) {
            setErrorMessage('Error al buscar clientes. Intenta nuevamente.');
            console.error('Error al buscar clientes:', error);
        } finally {
            setIsLoading(false);
        }
    };
    


    // Función para abrir formulario de edición
    const handleEditarCliente = (cliente: Cliente) => {
        setClienteEditando(cliente);
        setMostrarFormulario(true);
    };

    // Función para cerrar formulario
    const handleCerrarFormulario = () => {
        setClienteEditando(undefined);
        setMostrarFormulario(false);
    };

    // Función para manejar envío del formulario (decide entre crear o actualizar)
    const handleSubmitFormulario = async (data: Omit<Cliente, 'id_cliente' | 'fecha_registro'>) => {
        if (clienteEditando) {
            await handleActualizarCliente(data);
        } else {
            await handleCrearCliente(data);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6"> 
            <div className="flex justify-between items-center mb-6">
                <a className='items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors' href='/clientes'>Volver</a>
                {!mostrarFormulario && (
                    <button
                        onClick={() => setMostrarFormulario(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Nuevo Cliente
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
                        <p className="mt-4 text-gray-700">Cargando clientes...</p>
                    </div>
                </div>
            )}

            {mostrarFormulario ? (
                <ClienteForm
                    cliente={clienteEditando}
                    onSubmit={handleSubmitFormulario}
                    isSubmitting={isLoading}
                    onCancel={handleCerrarFormulario}
                />
            ) : !isLoading && (
                <ClientesList
                    clientes={clientes}
                    onEdit={handleEditarCliente}
                    onDelete={handleEliminarCliente}
                    onSearch={handleBuscarClientes}
                />
            )}
        </div>
    );
}