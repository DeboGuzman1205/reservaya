'use client';

import { useState, useEffect } from 'react';

interface RealtimeStatusProps {
  isConnected: boolean;
  connections: {
    reservas: boolean;
    canchas: boolean;
  };
  errors?: string[];
  className?: string;
}

const RealtimeStatus = ({ 
  isConnected, 
  connections, 
  errors = [], 
  className = '' 
}: RealtimeStatusProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Auto-ocultar detalles después de 5 segundos
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  const totalConnections = Object.values(connections).filter(Boolean).length;
  const maxConnections = Object.keys(connections).length;

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
          isConnected 
            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
            : 'bg-red-100 text-red-800 hover:bg-red-200'
        } ${errors.length > 0 ? 'border border-yellow-300' : ''}`}
        onClick={() => setShowDetails(!showDetails)}
        title="Click para ver detalles de conexión"
      >
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } ${isConnected ? 'animate-pulse' : ''}`}></div>
        <span>
          {isConnected ? 'En línea' : 'Desconectado'}
        </span>
        <div className="text-xs opacity-75">
          ({totalConnections}/{maxConnections})
        </div>
      </div>

      {/* Panel de detalles desplegable */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64 z-50">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 border-b pb-2">
              Estado de Conexiones Realtime
            </div>
            
            {/* Estado de cada conexión */}
            <div className="space-y-2">
              <ConnectionItem 
                name="Reservas" 
                connected={connections.reservas} 
                icon="📅"
              />
              <ConnectionItem 
                name="Canchas" 
                connected={connections.canchas} 
                icon="🏟️"
              />
            </div>

            {/* Errores si los hay */}
            {errors.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-xs font-medium text-red-600 mb-1">
                  Errores de conexión:
                </div>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-500 bg-red-50 p-1 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado general */}
            <div className="border-t pt-2 text-xs text-gray-500">
              <div>Estado general: {isConnected ? '🟢 Operativo' : '🔴 Desconectado'}</div>
              <div>Última verificación: {new Date().toLocaleTimeString('es-AR')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente auxiliar para mostrar el estado de cada conexión
const ConnectionItem = ({ 
  name, 
  connected, 
  icon 
}: { 
  name: string; 
  connected: boolean; 
  icon: string; 
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <span>{icon}</span>
      <span className="text-sm">{name}</span>
    </div>
    <div className={`text-xs px-2 py-1 rounded-full ${
      connected 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700'
    }`}>
      {connected ? 'Conectado' : 'Desconectado'}
    </div>
  </div>
);

export default RealtimeStatus;