'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  description, 
  icon,
  trend,
  trendDirection = 'neutral',
  className = ''
}: StatCardProps) {
  const getTrendColor = () => {
    if (trendDirection === 'up') return 'text-green-500';
    if (trendDirection === 'down') return 'text-red-500';
    return 'text-gray-500';
  };
  
  const getTrendIcon = () => {
    if (trendDirection === 'up') return '↑';
    if (trendDirection === 'down') return '↓';
    return '→';
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-black">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {description && (
            <p className="text-sm text-black mt-1">{description}</p>
          )}
          {trend !== undefined && (
            <p className={`text-sm font-medium mt-2 ${getTrendColor()}`}>
              {getTrendIcon()} {trend}%
            </p>
          )}
        </div>
        <div className="p-2 rounded-full bg-blue-500 text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}