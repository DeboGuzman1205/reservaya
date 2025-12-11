'use client';

import { Toaster } from 'react-hot-toast';
import { toasterConfig } from '@/lib/notifications';

export default function ToasterProvider() {
  // Renderizar directamente sin esperar montaje
  return <Toaster {...toasterConfig} />;
}
