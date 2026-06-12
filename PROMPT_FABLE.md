# 🎯 PROMPT MAESTRO — Construir "Leak Sniper" (SaaS de detección de filtraciones musicales)

> Pega esto completo en una ventana nueva de Code (Claude Code). Construye el proyecto desde
> cero, aplicando DESDE EL DÍA 1 todas las "⚠️ LECCIONES CRÍTICAS" para no repetir errores ya
> conocidos. Es un SaaS real que se vende a una distribuidora de Sony — hazlo a la perfección,
> robusto y sin errores feos.

---

## 1. OBJETIVO
**Leak Sniper**: SaaS web (con login) que **detecta filtraciones de música no lanzada**
monitoreando **YouTube y Spotify** por palabras clave, y muestra las detecciones en un panel
(todo in-app: sin Telegram/email/n8n). Es **white-label** y **multiusuario con roles**. Cliente
objetivo: **The Orchard** (distribuidora de Sony Music), para proteger el catálogo de sus artistas.

## 2. STACK (obligatorio)
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS v3**
- **Supabase**: Postgres + Auth (cookie-based con `@supabase/ssr`) + Realtime
- **Vercel**: hosting + Vercel Cron
- **YouTube Data API v3** + **Spotify Web API** (credenciales del cliente, NO en el código)
- Fuentes: **Bricolage Grotesque** (títulos), **IBM Plex Mono** (números), **Inter** (texto)
- Paquetes: `next@14`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`

## 3. IDENTIDAD VISUAL
Fondo casi negro `#080807`, acento dorado `#F5B500`, estética de "panel de inteligencia/
seguridad" (no template genérico). Logo "LeakSniper" + sublínea del cliente + ícono de mira.
KPI en números mono grandes. **El color de acento debe ser configurable en runtime** (ver §12).

---

## 4. ESQUEMA DE BASE DE DATOS (Supabase, SQL con RLS + Realtime + seed)
Tablas. RLS activado en todas. **Service_role (motor) ignora RLS.**

- **artists**: id (uuid pk), name, slug (unique), status ('active'|'paused'), risk_level
  ('alto'|'medio'|'bajo'), notes, created_at
- **keywords**: id, artist_id (fk→artists, on delete cascade), term, platform
  ('youtube'|'spotify'|'all'), active (bool default true), created_at
- **official_channels** (lista blanca): id, artist_id (fk cascade), platform, name, channel_id
  (opcional), created_at
- **leaks**: id, artist_id (fk cascade), keyword_id (fk set null), platform, external_id, url,
  title, channel, thumbnail_url, views (int), published_at, detected_at (default now), status
  ('nueva'|'revisada'|'takedown_enviado'|'resuelta'), score (int). **UNIQUE (platform, external_id)** ← dedup.
- **scan_runs**: id, started_at, finished_at, artists_scanned, keywords_scanned,
  youtube_units_used, leaks_found, triggered_by ('cron'|'manual'), status ('ok'|'error'), error_message
- **settings** (singleton id=1): scan_interval_hours (def 1), daily_quota_limit (def 10000),
  unit_cost_per_search (def 100), alert_threshold_views, client_name (def 'The Orchard'),
  **brand_name** (def 'Leak Sniper'), **accent_color** (def '#F5B500'), **login_tagline**,
  youtube_api_key, spotify_client_id, spotify_client_secret, updated_at
- **profiles** (multiusuario): id (uuid pk → auth.users, on delete cascade), email, full_name,
  role ('admin'|'viewer' default viewer), created_at. **Trigger** `on auth.users insert` que
  crea el perfil automáticamente (rol viewer). Backfill: usuarios existentes = admin.

**RLS por rol (clave):**
- Función `public.is_admin()` (security definer) que devuelve si `auth.uid()` tiene role admin.
- **artists / keywords / official_channels / settings**: SELECT para todo `authenticated`;
  INSERT/UPDATE/DELETE **solo si `is_admin()`**.
- **leaks**: lectura + escritura para todo `authenticated` (triage operativo lo hacen viewers).
- **profiles**: SELECT para todo authenticated; escritura solo vía service_role (Server Actions).
- **scan_runs**: lectura authenticated; escritura del motor vía service_role.

**Realtime**: agregar `leaks` y `scan_runs` a la publicación `supabase_realtime` (`scan_runs`
con `replica identity full` para recibir UPDATE).

**Seed**: artista "Jere Klein" (active, alto) + 8 keywords + settings default + canal oficial
"Jere Klein". (En producción se resetea para que el cliente cargue los suyos.)

---

## 5. AUTENTICACIÓN + MULTIUSUARIO
- `@supabase/ssr`: clientes browser (`createBrowserClient`), server (`createServerClient` con
  cookies) y **admin** (supabase-js con service_role, solo servidor).
- `middleware.ts` refresca sesión y protege rutas. Públicas: `/login`, `/api/scan`,
  `/api/health`, `/api/branding`, y estáticos (`.html`, imágenes). **Ojo: cambios en el
  `matcher` requieren reiniciar el server.**
- Login email/clave. **Permitir usuario corto** (escribir "orchard" → mapear a
  `orchard@theorchard.com`). Input `type="text"` (no `email`, para aceptar sin @).
- **Helper `getCurrentUser()`** (servidor): devuelve {id, email, role} leyendo `profiles`.
- **Roles**: `admin` (control total) vs `viewer` (solo ver). 
  - Páginas **/ajustes** y **/usuarios**: redirigen a `/` si no es admin.
  - El **nav** muestra Usuarios/Ajustes solo a admin; los botones de edición se ocultan a viewers.
  - Las Server Actions de gestión de usuarios usan `requireAdmin()` (el admin client ignora RLS,
    así que el chequeo de rol en código es obligatorio ahí).
- **Gestión de usuarios** (`/usuarios`, solo admin): crear usuario (email/usuario + contraseña
  mín. 10 + rol), cambiar rol, borrar (no a sí mismo). Crear usa el admin client
  (`auth.admin.createUser` + upsert del perfil con el rol elegido).
- **Seguridad de contraseñas**: largo mínimo 10. (La protección anti-contraseñas-filtradas
  "HIBP" de Supabase requiere plan Pro.)

## 6. PÁGINAS
1. **/login** — branding white-label (lee `/api/branding`, público).
2. **/** Dashboard — KPIs: Filtraciones totales, Artistas activos, Keywords activas, **YouTube**,
   **Spotify** (NO SoundCloud). "Sistema activo", countdown al próximo escaneo, botón "Escanear
   ahora", "Nuevas filtraciones". (Sin barra de cuota.)
3. **/artistas** — CRUD; nombre y nº filtraciones clickeables → detalle. (Botones de edición solo admin.)
4. **/artistas/[id]** — filtraciones del artista **agrupadas por año/mes**.
5. **/artistas/[id]/keywords** — CRUD keywords (optimistic, costo visible) + **Canales oficiales**.
6. **/filtraciones** — **agrupadas por mes (últimos 6 meses)**, filtrables (artista/plataforma/
   estado), estado editable, "Ver".
7. **/ajustes** (solo admin) — Marca/White-label (brand_name, client_name, login_tagline, color
   picker), General, Cuota, **Credenciales de API** (cliente pega YouTube/Spotify; blanco = conserva).
8. **/usuarios** (solo admin) — gestión de usuarios y roles.
- Nav: Panel · Artistas · Filtraciones (badge) · [Usuarios · Ajustes solo admin] + campanita + Salir.

## 7. MOTOR DE ESCANEO (`/api/scan`)
Protegido (Bearer `CRON_SECRET` para cron, o sesión para manual). `vercel.json` con cron.
1. Lee settings + artistas activos (orden por riesgo alto primero) + keywords activas.
2. **Ventana de fecha**: `publishedAfter = inicio de HOY` (de hoy en adelante, no histórico).
   - **YouTube**: pasa `publishedAfter` + `order=date` a la API (búsqueda ordenada por fecha).
   - **Spotify**: su búsqueda NO ordena por fecha → filtrar resultados por `release_date`
     usando una ventana de **últimos 3 días** (zona horaria/indexación; dedup evita repetir).
3. Por keyword: YouTube `search.list` (type=video, order=date, publishedAfter, **maxResults=50**,
   100 unidades; chequear cuota ANTES, nunca fallar por cuota) + Spotify search type=track
   **limit=10** (apps en dev mode topan ahí). **Pausa ~400ms entre búsquedas** (rate-limit 429).
4. Filtros antes de insertar (en orden): (a) **canal oficial** (substring del nombre oficial en
   canal/artistas, o channel_id), (b) **ruido** (ver §11), (c) **relevancia** (si la keyword
   incluye el nombre del artista, exigir que ese nombre aparezca en el resultado).
5. **Dedup** por (platform, external_id); insertar nuevo con status 'nueva'.
6. Registrar en `scan_runs`. **NUNCA lanzar al caller** (try/catch total).

## 8. NOTIFICACIONES IN-PANEL
Leak 'nueva' = notificación. Campanita con contador EXACTO (`head:true count`, no length),
dropdown, badge en Filtraciones. Realtime INSERT en `leaks` (toast con debounce ~700ms; ráfaga
→ toast agregado) + UPDATE en `scan_runs` (avisar al terminar, incluso "sin filtraciones"). El
botón "Escanear ahora" además empuja un toast del resultado (confiable sin realtime). Campanita:
**Refrescar** + **Limpiar** (marcar todas revisadas); por item **Ver** + **Revisada**.

## 9. ROBUSTEZ
Toda llamada externa en try/catch. APIs caídas/sin cuota → estado elegante (nunca pantalla rota).
Skeletons + estados vacíos. Validación de forms. Sin promesas sin catch. Sin credenciales → el
panel funciona y avisa "configura tu API key en Ajustes".

## 10. ENV VARS
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`CRON_SECRET`. `.env.example`. **YouTube/Spotify keys NO en env** → el cliente las pega en
/ajustes (tabla `settings`). Endpoint público `/api/branding` (sin secretos) para el login.

## 11. FILTRO DE RUIDO (excluir si título o canal contiene)
`beat`, `type beat`, `prod.`, `reacc`, `reaction`, `lyric`, `letra`, `en vivo`, `live`,
`performance`, `cover`, `tutorial`, `slowed`, `sped up`, `nightcore`, `instrumental`, `karaoke`,
`remix de`, `mashup`, `entrevista`, `podcast`, `review`, `#short`, `edit`, `fanmade`, `amv`, y
noticias/chismes: `da detalles`, `da señales`, `próximo ep`, `se filtró`, `filtración de`,
`noticia`, `rumor`, `confirma`, `extended`, `exclusiva`, `remaster`, `fixed`, `#viral`, `radio`,
`así sonaría`, `mi verso`, `preview de`.

---

## 12. ⚠️ LECCIONES CRÍTICAS (aplicar desde el inicio — esto costó horas)

**Supabase**
- Usar `@supabase/ssr`. Tipar `setAll(cookiesToSet: CookieToSet[])` (si no, error TS implicit any).
- **Anon key: usar la legacy JWT (`eyJ...`)**. Las nuevas `sb_publishable_` pueden dar "Invalid
  API key" según el proyecto. Service_role para el motor. Realtime UPDATE → `replica identity full`.

**YouTube Data API**
- 100 unidades/búsqueda. **10.000/día gratis = ~100 búsquedas/día** → se agota rápido. Manejar
  403 `quotaExceeded` y 429 `rateLimitExceeded` SIN crashear. El cliente pide aumento de cuota a
  Google (formulario gratis "YouTube API Services - Audit and Quota Extension"). maxResults 0–50.

**Spotify Web API**
- Flujo **client-credentials**. La búsqueda EXIGE que la cuenta DUEÑA de la app tenga **Premium**
  (cuentas free → 403 "premium required for the owner of the app" en TODOS los endpoints).
  Solución: Premium propio + **Extended Quota Mode** (formulario). Los socios de Spotify (Sony)
  lo consiguen fácil.
- **limit máx ~10** en modo desarrollo (20+ → 400 "Invalid limit"). Endpoints `browse/*` dan 403,
  solo `search` sirve. El **Redirect URI** del dashboard ya NO acepta `http://localhost` → usar
  `http://127.0.0.1:3000`.
- **La búsqueda de Spotify ordena por RELEVANCIA, no por fecha.** → Para captar leaks de hoy en
  Spotify, la keyword debe ser el **TÍTULO EXACTO del tema** (así el leak sale arriba); el nombre
  del artista solo NO sirve (lo de hoy queda enterrado). Modelo Bring-Your-Own-Keys.

**Detección / calidad**
- Ventana "desde HOY" (YouTube) / "últimos 3 días" (Spotify) + dedup = avisar una vez sin catálogo viejo.
- Keywords = **títulos de temas NO lanzados** (no hits ya publicados, que traen reposts/ruido).
- Espaciar búsquedas ~400ms.

**White-label (color de acento configurable en runtime)**
- Definir `gold` en Tailwind como `rgb(var(--gold-500) / <alpha-value>)` (canales RGB) para
  **preservar los modificadores de opacidad** (`text-gold/40`). Defaults en `:root`. Inyectar
  `--gold-*` desde `settings.accent_color` en el layout del panel y en /login (vía `/api/branding`
  público, porque login es pre-auth). Helper que convierte hex → "r g b" y genera tonos.

**Multiusuario / RLS por rol**
- La seguridad de roles va en **RLS** (no solo en la UI): escritura de gestión solo si `is_admin()`.
  Verificar con un viewer real: su INSERT debe dar error **42501** (insufficient_privilege).
- Las Server Actions con `admin client` (service_role) **ignoran RLS** → ahí el chequeo
  `requireAdmin()` en código es obligatorio (gestión de usuarios).

**TypeScript / build / deploy**
- NO usar `any` (eslint `no-explicit-any` rompe el build). Iterar Set/Map con `Array.from` (TS2802).
- **NO correr `npm run build` con el dev server activo** (corrompe `.next` → detener dev,
  `rm -rf .next`, reiniciar).
- **Deploy Vercel**: plan **Hobby solo permite cron DIARIO** (`0 9 * * *`); para horario
  (`0 * * * *`) se necesita **Pro**. Tras crear el proyecto, **desactivar "Vercel Authentication"**
  (ssoProtection) o el sitio queda detrás de login de Vercel. Cargar las 4 env vars en producción.

---

## 13. ENTREGABLES
Migraciones SQL en `/supabase/migrations` (esquema + RLS + realtime + seed + branding +
official_channels + profiles/roles + RLS por rol). App completa (8 páginas + `/api/scan` +
`/api/health` + `/api/branding` + `vercel.json`). `.env.example`, `README`, `HANDOFF.md`. Build
de producción verde, sin errores de tipos ni lint.

## 14. CRITERIO DE ACEPTACIÓN
- Multiusuario: admin gestiona usuarios/roles; **viewer no puede modificar (RLS lo bloquea)**.
- Agregar artista + keywords + canal oficial sin tocar código (admin).
- KPIs correctos; campanita/badge en vivo; aviso al terminar escaneo (aunque sea 0).
- `/api/scan` busca YouTube+Spotify, deduplica, filtra ruido/relevancia/oficial, registra cuota y
  NO falla sin cuota.
- Filtraciones y detalle de artista agrupados por mes; "Ver" abre el link real.
- White-label aplica al instante (panel + login). Nada crashea. Se ve como Leak Sniper.

## 15. NOTA DE ESCALA Y PRODUCCIÓN
- **A escala (cientos de artistas)** el escaneo en una sola función serverless (límite 60s) NO
  alcanza → reescribir con **cola + workers** (Inngest/QStash): el cron encola un job por artista,
  workers en paralelo con backoff. Más: aumento de cuota YouTube/Spotify (formularios), Supabase
  Pro + Vercel Pro.
- **Para venta enterprise** falta además: audit log, monitoreo (Sentry/uptime), backups, y la
  capa legal (entidad, contrato, SLA, DPA). Camino: **Deploy → Demo → Piloto pagado → endurecer**.
  Ningún SaaS es "sin errores para siempre"; lo enterprise es CONFIABILIDAD (monitoreo + backups +
  soporte + SLA), no cero errores.

Empieza por el esquema Supabase (incl. profiles + RLS por rol) → `/api/scan` + vercel.json →
login + multiusuario + dashboard + notificaciones → el resto. Aplica las LECCIONES CRÍTICAS
desde el inicio.
