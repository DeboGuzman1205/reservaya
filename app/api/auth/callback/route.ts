import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    if (code) {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ 
        cookies: () => cookieStore 
      });
      
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
                return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
        );
      }
    }

    // URL a la que redirigir después de la autenticación exitosa
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=Error+inesperado+de+autenticación', request.url)
    );
  }
}
