// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Crear cliente Supabase con soporte de cookies
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refrescar la sesión si es necesario
    await supabase.auth.getSession()

    // Obtener la sesión actual después de refrescar
    const { data: { session } } = await supabase.auth.getSession()

    const pathname = req.nextUrl.pathname

    // Rutas públicas que no requieren autenticación
    const isPublicRoute = pathname === '/login' || 
                          pathname.startsWith('/api/auth') ||
                          pathname.includes('favicon.ico')

    // Si NO hay sesión y la ruta no es pública, redirigir a login
    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Si hay sesión y está en /login, redirigir al dashboard
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  } catch {

  }

  // Continuar con la request normalmente
  return res
}

// Configurar las rutas a las que aplica el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
}
