'use client';

import { Toaster } from 'react-hot-toast';
import { toasterConfig } from '@/lib/notifications';

export default function ToasterProvider() {
  return <Toaster {...toasterConfig} />;
}
