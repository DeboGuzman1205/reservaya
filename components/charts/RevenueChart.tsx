'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface RevenueChartProps {
  data?: Array<{ mes: string; ingresos: number }>;
}

export default function RevenueChart({ data: revenueData }: RevenueChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Ingresos Mensuales',
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  // Datos por defecto o datos reales
  const defaultLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre'];
  const defaultValues = [12000, 13500, 14200, 13800, 15500, 16200, 17000, 16500, 15000];

  const labels = revenueData?.map(item => item.mes) || defaultLabels;
  const values = revenueData?.map(item => item.ingresos) || defaultValues;

  const data = {
    labels,
    datasets: [
      {
        label: 'Ingresos ($)',
        data: values,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.4,
      }
    ],
  };

  return (
    <div className="h-72">
      <Line options={options} data={data} />
    </div>
  );
}