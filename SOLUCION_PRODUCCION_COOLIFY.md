# 🚨 SOLUCIÓN: Notificaciones y Realtime en Producción

## Diagnóstico Actual:
❌ Toaster no se renderiza en el DOM
❌ Cliente Supabase no disponible globalmente
❌ Realtime no funciona entre sesiones

---

## ✅ SOLUCIÓN COMPLETA

### PASO 1: Verificar build en Coolify

En Coolify, ve a tu aplicación → **Logs** y busca errores durante el build.

Específicamente busca:
- Errores de `react-hot-toast`
- Errores de `@supabase/supabase-js`
- Errores de TypeScript

### PASO 2: Limpiar build cache en Coolify

1. En Coolify → Tu aplicación
2. Click en **"Settings"** o **"Configuration"**
3. Busca **"Clear Build Cache"** o similar
4. Click en **"Force Rebuild"** con cache limpio

### PASO 3: Verificar variables de entorno en Coolify

Asegúrate de tener EXACTAMENTE:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase-lucas.acostaparra.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTMwNjAyMCwiZXhwIjo0OTIwOTc5NjIwLCJyb2xlIjoiYW5vbiJ9.Mq98XuDtW4c87w6UEirRfX12UMPAtuHVI2_O05vRmhs
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTMwNjAyMCwiZXhwIjo0OTIwOTc5NjIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.hn2tdzGJTi9HZsU4NQi-sFrMmUrZIx0B3aElfPF0oLA
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9jj3a12gg
```

⚠️ **SIN barra final en NEXT_PUBLIC_SUPABASE_URL**

### PASO 4: Configurar comando de build correcto

En Coolify, el comando de build debe ser:

```bash
npm install && npm run build
```

El comando de start debe ser:

```bash
npm start
```

### PASO 5: Verificar después del rebuild

Una vez que termine el rebuild, ejecuta en la consola de producción:

```javascript
// Test simple
console.log('Supabase URL:', process?.env?.NEXT_PUBLIC_SUPABASE_URL);
console.log('Toaster en DOM:', !!document.querySelector('[class*="Toaster"]'));

// Inicializar cliente manualmente para probar
const { createClient } = await import('@supabase/supabase-js');
const testClient = createClient(
  'https://supabase-lucas.acostaparra.com',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTMwNjAyMCwiZXhwIjo0OTIwOTc5NjIwLCJyb2xlIjoiYW5vbiJ9.Mq98XuDtW4c87w6UEirRfX12UMPAtuHVI2_O05vRmhs'
);
console.log('Cliente creado:', !!testClient);
console.log('Canales:', testClient.getChannels().length);
```

---

## 🔍 Si el problema persiste:

### Opción A: Revisar logs de Coolify

```bash
# Logs de build
docker logs <container-id-build>

# Logs de runtime
docker logs <container-id-app>
```

Busca:
- Module not found errors
- TypeScript errors
- Environment variable issues

### Opción B: Verificar Dockerfile/Build Config

Si Coolify usa un Dockerfile personalizado, asegúrate de que tenga:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables en build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Opción C: Verificar next.config.ts

Asegúrate de que tenga output standalone si usas Docker:

```typescript
const nextConfig = {
  output: 'standalone', // Para Docker
  // ... resto de config
};
```

---

## 📊 Checklist de Verificación:

Después del rebuild, confirma:

- [ ] Build completado sin errores en Coolify
- [ ] Variables de entorno correctas (sin barra final en URL)
- [ ] Aplicación accesible en el dominio
- [ ] Console.log no muestra errores 404
- [ ] Toaster aparece en el DOM
- [ ] Cliente Supabase se inicializa
- [ ] Canales Realtime se crean
- [ ] Notificación toast aparece al crear reserva
- [ ] Realtime funciona entre 2 sesiones diferentes

---

## 🆘 Si nada funciona:

Prueba hacer rollback a la última versión que funcionaba y aplica los cambios uno por uno:

1. Primero solo las notificaciones (ToasterProvider)
2. Luego la corrección de timezone
3. Finalmente verificar Realtime

Cada cambio debe deployarse y probarse individualmente.
