'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface WeeklyBookingsChartProps {
  data?: Array<{ dia: string; cantidad: number }>;
}

export default function WeeklyBookingsChart({ data: chartData = [] }: WeeklyBookingsChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Ocultar leyenda ya que los colores son por día
      },
      title: {
        display: true,
        text: 'Reservas por Día de la Semana (Este Mes)',
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
            return `${context.parsed.y} reserva${context.parsed.y !== 1 ? 's' : ''}`;
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
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
      }
    }
  };

  // Mapear los datos reales o usar valores por defecto
  const labels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Asegurar que tenemos datos válidos
  const datosValidos = Array.isArray(chartData) ? chartData : [];
  
  const valores = labels.map(dia => {
    const encontrado = datosValidos.find(item => 
      item && typeof item === 'object' && 'dia' in item && 'cantidad' in item && 
      item.dia === dia
    );
    return encontrado ? (Number(encontrado.cantidad) || 0) : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Número de Reservas',
        data: valores,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',   // Domingo - Rojo
          'rgba(54, 162, 235, 0.7)',   // Lunes - Azul  
          'rgba(255, 205, 86, 0.7)',   // Martes - Amarillo
          'rgba(75, 192, 192, 0.7)',   // Miércoles - Verde agua
          'rgba(153, 102, 255, 0.7)',  // Jueves - Púrpura
          'rgba(255, 159, 64, 0.7)',   // Viernes - Naranja
          'rgba(201, 203, 207, 0.7)',  // Sábado - Gris
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(201, 203, 207, 1)',
        ],
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