'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CourtUsageChartProps {
  data?: Array<{ nombre: string; cantidad: number }>;
}

export default function CourtUsageChart({ data: courtData }: CourtUsageChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Ocultar leyenda
      },
      title: {
        display: true,
        text: 'Reservas por Cancha (Semana Actual: Lun-Dom)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#374151',
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: { parsed: { y: number } }) {
            return `${context.parsed.y} reserva${context.parsed.y !== 1 ? 's' : ''} en la semana`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        title: {
          display: true,
          text: 'Cantidad de Reservas',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
      x: {
        ticks: {
          color: '#6B7280',
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }
    }
  };

  // Asegurar que tenemos datos válidos
  const datosValidos = Array.isArray(courtData) && courtData.length > 0 ? courtData : [];
  
  // Si no hay datos reales, mostrar mensaje
  if (datosValidos.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-lg font-semibold mb-2">Reservas por Cancha (Semana Actual)</div>
          <div className="text-sm">No hay datos disponibles para mostrar</div>
        </div>
      </div>
    );
  }

  const labels = datosValidos.map(item => item.nombre);
  const values = datosValidos.map(item => item.cantidad);
  
  // Generar colores dinámicos basados en la cantidad de reservas
  const generateColors = (values: number[]) => {
    const maxValue = Math.max(...values);
    return values.map((value) => {
      if (value === 0) {
        return 'rgba(156, 163, 175, 0.5)'; // Gris claro para canchas sin reservas
      } else if (value === maxValue) {
        return 'rgba(34, 197, 94, 0.8)'; // Verde fuerte para la más reservada
      } else if (value >= maxValue * 0.7) {
        return 'rgba(59, 130, 246, 0.8)'; // Azul para alta demanda
      } else if (value >= maxValue * 0.4) {
        return 'rgba(251, 146, 60, 0.8)'; // Naranja para demanda media
      } else {
        return 'rgba(248, 113, 113, 0.8)'; // Rojo claro para baja demanda
      }
    });
  };
  
  const backgroundColors = generateColors(values);
  const borderColors = backgroundColors.map(color => color.replace('0.8', '1').replace('0.5', '0.8'));

  const data = {
    labels,
    datasets: [
      {
        label: 'Reservas Última Semana',
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }
    ],
  };

  return (
    <div className="h-72">
      <Bar options={options} data={data} />
    </div>
  );
}