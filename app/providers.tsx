'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createClientComponentClient());
  
  // Exponer supabase globalmente para debugging y scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).supabase = supabaseClient;
    }
  }, [supabaseClient]);
  
  return (
    <SessionContextProvider 
      supabaseClient={supabaseClient}
      initialSession={null}
    >
      {children}
    </SessionContextProvider>
  );
}