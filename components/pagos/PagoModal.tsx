import React, { useState, useEffect } from 'react';
import { type Pago } from '@/lib/usePagosRealtime';

// Tipo para el formulario de pago (sin campos autogenerados)
type PagoFormData = Omit<Pago, 'id_pago' | 'fecha_pago'>;

interface PagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pago: PagoFormData) => Promise<void>;
  pago?: Pago | null;
  title: string;
}

export default function PagoModal({ isOpen, onClose, onSave, pago, title }: PagoModalProps) {
  const [formData, setFormData] = useState<PagoFormData>({
    id_reserva: 0,
    monto: 0,
    estado_pago: 'pendiente',
    mp_id: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear form cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (pago) {
        setFormData({
          id_reserva: pago.id_reserva,
          monto: pago.monto,
          estado_pago: pago.estado_pago,
          mp_id: pago.mp_id || ''
        });
      } else {
        setFormData({
          id_reserva: 0,
          monto: 0,
          estado_pago: 'pendiente',
          mp_id: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, pago]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Manejar tecla Escape para cerrar modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id_reserva || formData.id_reserva <= 0) {
      newErrors.id_reserva = 'El ID de reserva es requerido y debe ser válido';
    }

    if (!formData.monto || formData.monto <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }

    if (!formData.estado_pago) {
      newErrors.estado_pago = 'El estado del pago es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const pagoData = {
        ...formData,
        mp_id: formData.mp_id || null
      };
      
      await onSave(pagoData);
      onClose();
    } catch {
      setErrors({ general: 'Error al guardar el pago' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'id_reserva' || name === 'monto' ? Number(value) : value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay de fondo */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          style={{ zIndex: 9998 }}
        ></div>

        {/* Espaciador invisible para centrado vertical */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div 
          className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
          style={{ zIndex: 10000 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {title}
              </h3>

              {errors.general && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="id_reserva" className="block text-sm font-medium text-gray-700">
                    ID de Reserva *
                  </label>
                  <input
                    type="number"
                    id="id_reserva"
                    name="id_reserva"
                    value={formData.id_reserva || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.id_reserva ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ej: 123"
                    disabled={!!pago} // Deshabilitar si es edición
                    autoFocus={!pago} // Auto-focus en el primer campo si es nuevo
                  />
                  {errors.id_reserva && (
                    <p className="mt-1 text-sm text-red-600">{errors.id_reserva}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="monto" className="block text-sm font-medium text-gray-700">
                    Monto *
                  </label>
                  <input
                    type="number"
                    id="monto"
                    name="monto"
                    value={formData.monto || ''}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.monto ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.monto && (
                    <p className="mt-1 text-sm text-red-600">{errors.monto}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="estado_pago" className="block text-sm font-medium text-gray-700">
                    Estado del Pago *
                  </label>
                  <select
                    id="estado_pago"
                    name="estado_pago"
                    value={formData.estado_pago}
                    onChange={handleChange}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.estado_pago ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="desconocido">Desconocido</option>
                  </select>
                  {errors.estado_pago && (
                    <p className="mt-1 text-sm text-red-600">{errors.estado_pago}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="mp_id" className="block text-sm font-medium text-gray-700">
                    MercadoPago ID
                  </label>
                  <input
                    type="text"
                    id="mp_id"
                    name="mp_id"
                    value={formData.mp_id || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Opcional"
                  />
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </div>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
