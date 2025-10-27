import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { AutoCancelProvider } from '@/components/AutoCancelProvider';


export const revalidate = 0;

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  try {
    // Crear cliente de Supabase en servidor
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    // Verificar si hay una sesión activa
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Si hay un error o no hay sesión, redirigir a login
    if (error || !session) {
            redirect('/login');
    }
    
    return (
      <AutoCancelProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 overflow-auto p-8 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </AutoCancelProvider>
    );
  } catch {
    redirect('/login');
  }
}
