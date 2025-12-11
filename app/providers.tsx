'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Toaster } from 'sonner';

// Extender Window para incluir supabase
declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createClientComponentClient());
  
  // Exponer supabase globalmente para debugging y scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.supabase = supabaseClient;
    }
  }, [supabaseClient]);
  
  return (
    <SessionContextProvider 
      supabaseClient={supabaseClient}
      initialSession={null}
    >
      <Toaster position="top-right" richColors />
      {children}
    </SessionContextProvider>
  );
}