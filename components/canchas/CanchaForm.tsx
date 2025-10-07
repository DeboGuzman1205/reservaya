'use client';

import { useState } from 'react';
import { Cancha } from '@/types';

interface CanchaFormProps {
  cancha?: Cancha;
  onSubmit: (data: Omit<Cancha, 'id_cancha' | 'created_at'>) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function CanchaForm({ 
  cancha, 
  onSubmit, 
  isSubmitting, 
  onCancel 
}: CanchaFormProps) {
  const [nombreCancha, setNombreCancha] = useState(cancha?.nombre_cancha || '');
  const [tipoCancha, setTipoCancha] = useState<string>(cancha?.tipo_cancha || '5');
  const [disponibilidadHoraria, setDisponibilidadHoraria] = useState(cancha?.disponibilidad_horaria || '08:00-23:00');
  const [estadoCancha, setEstadoCancha] = useState<'disponible' | 'no disponible' | 'mantenimiento'>(cancha?.estado_cancha || 'disponible');
  const [tarifaHora, setTarifaHora] = useState<number>(cancha?.tarifa_hora || 0);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!nombreCancha.trim()) {
      setError('El nombre de la cancha es obligatorio');
      return;
    }
    
    try {
      await onSubmit({
        nombre: nombreCancha,
        tipo: tipoCancha,
        disponibilidad_horaria: disponibilidadHoraria,
        estado_cancha: estadoCancha,
        tarifa_hora: tarifaHora
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la cancha');
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {cancha ? 'Editar Cancha' : 'Nueva Cancha'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="nombre" className="block mb-2 text-sm font-medium text-gray-700">
            Nombre de la cancha
          </label>
          <input
            type="text"
            id="nombre"
            value={nombreCancha}
            onChange={(e) => setNombreCancha(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Cancha Principal"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="tipo" className="block mb-2 text-sm font-medium text-gray-700">
            Tipo de cancha
          </label>
          <select
            id="tipo"
            value={tipoCancha}
            onChange={(e) => setTipoCancha(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="5">5 Jugadores</option>
            <option value="6">6 Jugadores</option>
            <option value="7">7 Jugadores</option>
            <option value="8">8 Jugadores</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="disponibilidad" className="block mb-2 text-sm font-medium text-gray-700">
            Disponibilidad Horaria
          </label>
          <input
            type="text"
            id="disponibilidad"
            value={disponibilidadHoraria}
            onChange={(e) => setDisponibilidadHoraria(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: 08:00-23:00"
          />
          <p className="mt-1 text-sm text-gray-500">Formato: HH:MM-HH:MM</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="estado" className="block mb-2 text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="estado"
            value={estadoCancha}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'disponible' || value === 'no disponible' || value === 'mantenimiento') {
                setEstadoCancha(value);
              }
            }}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="disponible">Disponible</option>
            <option value="no disponible">No disponible</option>
            <option value="mantenimiento">En mantenimiento</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label htmlFor="tarifaHora" className="block mb-2 text-sm font-medium text-gray-700">
            Tarifa por hora ($)
          </label>
          <input
            type="number"
            id="tarifaHora"
            value={tarifaHora}
            onChange={(e) => setTarifaHora(parseFloat(e.target.value))}
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: 100.00"
            required
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : (
              'Guardar Cancha'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}