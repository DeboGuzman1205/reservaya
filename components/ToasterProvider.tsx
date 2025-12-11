'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { toasterConfig } from '@/lib/notifications';

export default function ToasterProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Solo renderizar después de que el componente se monte en el cliente
  if (!mounted) return null;

  return <Toaster {...toasterConfig} />;
}
