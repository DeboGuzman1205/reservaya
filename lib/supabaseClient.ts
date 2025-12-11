import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Cliente inteligente de Next.js que automáticamente inyecta cookies de autenticación
// Lee las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
// y maneja la sesión automáticamente
export const supabase = createClientComponentClient();