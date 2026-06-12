# 🎯 PROMPT MAESTRO — Construir "Leak Sniper" (SaaS de detección de filtraciones musicales)

> Pega esto completo en una ventana nueva de Code. Construye el proyecto desde cero,
> aplicando DESDE EL DÍA 1 todas las lecciones de la sección "⚠️ LECCIONES CRÍTICAS" para
> no repetir errores conocidos. Hazlo a la perfección.

---

## 1. OBJETIVO
Construir **Leak Sniper**: un SaaS web (con login) que **detecta filtraciones de música no
lanzada** monitoreando **YouTube y Spotify** por palabras clave, y muestra las detecciones en
un panel — todo dentro de la plataforma (sin Telegram/email/n8n). Es **white-label** y el
cliente objetivo es **The Orchard** (distribuidora de Sony Music).

## 2. STACK TECNOLÓGICO (obligatorio)
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS v3**
- **Supabase**: Postgres + Auth (cookie-based con `@supabase/ssr`) + Realtime
- **Vercel**: hosting + Vercel Cron para el escaneo automático
- **YouTube Data API v3** y **Spotify Web API** (credenciales del cliente, no en el código)
- Fuentes: **Bricolage Grotesque** (títulos), **IBM Plex Mono** (números), **Inter** (texto)
- Paquetes clave: `next@14`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`

## 3. IDENTIDAD VISUAL
- Fondo casi negro (`#080807`), acentos **dorado/ámbar `#F5B500`**. Estética de "panel de
  inteligencia/seguridad", no template genérico. KPI en números grandes (mono).
- Logo "LeakSniper" con sublínea del cliente ("THE ORCHARD") + ícono de mira (scope).
- El color de acento DEBE ser configurable en runtime (white-label, ver lección §12).

---

## 4. ESQUEMA DE BASE DE DATOS (Supabase / SQL con RLS + Realtime + seed)
Tablas (todas con RLS: solo usuarios `authenticated` leen/escriben; el `service_role` del
motor ignora RLS):

- **artists**: id (uuid pk), name, slug (unique), status ('active'|'paused'), risk_level
  ('alto'|'medio'|'bajo'), notes, created_at
- **keywords**: id, artist_id (fk→artists, on delete cascade), term, platform
  ('youtube'|'spotify'|'all'), active (bool default true), created_at
- **official_channels** (lista blanca): id, artist_id (fk cascade), platform, name, channel_id
  (opcional), created_at
- **leaks**: id, artist_id (fk cascade), keyword_id (fk set null), platform, external_id,
  url, title, channel, thumbnail_url, views (int), published_at, detected_at (default now),
  status ('nueva'|'revisada'|'takedown_enviado'|'resuelta'), score (int).
  **UNIQUE (platform, external_id)** ← dedup.
- **scan_runs**: id, started_at, finished_at, artists_scanned, keywords_scanned,
  youtube_units_used, leaks_found, triggered_by ('cron'|'manual'), status ('ok'|'error'),
  error_message
- **settings** (fila singleton id=1): scan_interval_hours (default 1), daily_quota_limit
  (default 10000), unit_cost_per_search (default 100), alert_threshold_views, client_name
  (default 'The Orchard'), **brand_name** (default 'Leak Sniper'), **accent_color** (default
  '#F5B500'), **login_tagline**, youtube_api_key, spotify_client_id, spotify_client_secret,
  updated_at

**Realtime**: agregar `leaks` y `scan_runs` a la publicación `supabase_realtime`
(`scan_runs` con `replica identity full` para recibir UPDATE).

**Seed**: artista "Jere Klein" (active, riesgo alto) + 8 keywords de ejemplo + settings default
+ canal oficial "Jere Klein".

---

## 5. AUTENTICACIÓN
- `@supabase/ssr` con clientes: browser (`createBrowserClient`), server (`createServerClient`
  con cookies), y **admin** (`createClient` de supabase-js con service_role, solo servidor).
- `middleware.ts` que refresca sesión y protege rutas. Rutas públicas: `/login`, `/api/scan`,
  `/api/health`, `/api/branding`, y archivos estáticos (`.html`, imágenes).
- Login simple email/clave. **Permitir usuario corto** (ej. escribir "orchard" → mapear a
  `orchard@<dominio>` internamente). Input tipo `text` (no `email`) para aceptar usuario sin @.

---

## 6. PÁGINAS
1. **/login** — login con branding white-label (lee `/api/branding`, público).
2. **/** (Dashboard) — KPIs: Filtraciones totales, Artistas activos, Keywords activas,
   **YouTube**, **Spotify** (NO SoundCloud). Estado "Sistema activo", countdown al próximo
   escaneo, botón "Escanear ahora", sección "Nuevas filtraciones". (Sin barra de cuota.)
3. **/artistas** — CRUD de artistas (tabla: nº keywords, nº filtraciones, riesgo, estado,
   botones Keywords/Pausar/Editar/Borrar). Nombre y nº de filtraciones clickeables → detalle.
4. **/artistas/[id]** — detalle del artista: sus filtraciones **agrupadas por año/mes**.
5. **/artistas/[id]/keywords** — CRUD de keywords (optimistic, costo de cuota visible) +
   sección **Canales oficiales** (lista blanca).
6. **/filtraciones** — filtraciones **agrupadas por mes (últimos 6 meses)**, filtrables por
   artista/plataforma/estado, estado editable, link directo "Ver".
7. **/ajustes** — secciones: **Marca/White-label** (brand_name, client_name, login_tagline,
   color de acento con color-picker), General, Cuota, y **Credenciales de API** (el cliente
   pega sus YouTube/Spotify keys; "deja en blanco = conserva las actuales").
- Nav: Panel · Artistas · Filtraciones (con badge) · Ajustes + campanita + Salir.

---

## 7. MOTOR DE ESCANEO (`/api/scan`) — el corazón
Ruta protegida (header `Authorization: Bearer ${CRON_SECRET}` para el cron, o sesión para
manual). Incluir `vercel.json` con cron `0 * * * *`. Lógica:
1. Lee settings + artistas activos (ordenados por riesgo: alto primero) + sus keywords activas.
2. **Ventana de fecha**: `publishedAfter = inicio de HOY` (solo detecta de hoy en adelante,
   NO el catálogo histórico). Para Spotify, filtrar resultados por `release_date >= hoy`.
3. Por cada keyword:
   - **YouTube** (si platform youtube/all): `search.list` (type=video, order=date,
     publishedAfter, maxResults=50). Cuesta 100 unidades. Chequear cuota ANTES; si se pasa de
     `daily_quota_limit`, priorizar riesgo alto y terminar limpio (NUNCA fallar por cuota).
   - **Spotify** (si platform spotify/all, y hay token): search type=track, **limit=10**
     (apps en dev mode topan ahí). Filtrar por release_date.
   - **Pausa de ~400ms entre búsquedas** (evitar rate-limit 429).
4. **Filtros antes de insertar** (en este orden):
   - **Canal oficial** (lista blanca): excluir si el nombre oficial aparece en el canal/artistas
     (substring) o coincide channel_id. (Ej. en Spotify un track que acredita "Jere Klein" es
     oficial → excluir.)
   - **Ruido**: excluir si título/canal contiene patrones de NO-filtración (ver §11).
   - **Relevancia**: si la keyword INCLUYE el nombre del artista, exigir que ese nombre aparezca
     en el resultado (evita resultados "relacionados" irrelevantes de la búsqueda fuzzy).
5. **Dedup** por (platform, external_id) — insertar solo lo nuevo con status 'nueva'.
6. Registrar cada corrida en `scan_runs`. NUNCA lanzar excepción al caller (try/catch total).
7. Disparo manual: botón "Escanear ahora" → POST /api/scan autenticado.

## 8. NOTIFICACIONES IN-PANEL
- Inserción de leak 'nueva' = la notificación. Campanita con contador (conteo EXACTO con
  `head:true count`, no el length del límite), dropdown con recientes, badge en "Filtraciones".
- **Realtime**: suscribirse a INSERT en `leaks` (toast en vivo, con debounce ~700ms para
  ráfagas; si entran muchas, un toast agregado) y a UPDATE en `scan_runs` (avisar al terminar
  el escaneo, incluso "no se encontraron filtraciones").
- El botón "Escanear ahora" además empuja un toast con el resultado (confiable, sin depender
  de realtime).
- Campanita: botones **Refrescar** y **Limpiar** (marcar todas revisadas). Por item: "Ver" y
  "Revisada" (descartar). Al revisar baja el contador.

## 9. ROBUSTEZ (CRÍTICO — nunca crashear ni mostrar errores feos)
- TODA llamada externa en try/catch. Si una API falla / sin cuota → estado informativo elegante.
- Skeletons/spinners + estados vacíos ("Aún no hay filtraciones") en cada vista.
- Validación de formularios. Sin promesas sin catch. Si faltan credenciales, el panel funciona
  igual y avisa "configura tu API key en Ajustes".

## 10. ENV VARS
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`CRON_SECRET`. Dejar `.env.example`. **Las credenciales de YouTube/Spotify NO van en env** →
el cliente las pega en /ajustes (se guardan en `settings`).

---

## 11. FILTRO DE RUIDO (patrones a excluir — título o canal)
`beat`, `type beat`, `prod.`, `reacc`, `reaction`, `lyric`, `letra`, `en vivo`, `live`,
`performance`, `cover`, `tutorial`, `slowed`, `sped up`, `nightcore`, `instrumental`,
`karaoke`, `remix de`, `mashup`, `entrevista`, `podcast`, `review`, `#short`, `edit`,
`fanmade`, `amv`, y de noticias/chismes: `da detalles`, `da señales`, `próximo ep`,
`se filtró`, `filtración de`, `noticia`, `rumor`, `confirma`, `extended`, `exclusiva`,
`remaster`, `fixed`, `#viral`, `radio`, `así sonaría`, `mi verso`, `preview de`.

---

## 12. ⚠️ LECCIONES CRÍTICAS (aplicar desde el día 1 — esto nos costó horas)

**Supabase**
- Usar `@supabase/ssr` (cookie auth). Tipar el callback `setAll(cookiesToSet: CookieToSet[])`
  (si no, error TS "implicitly any").
- **La anon key**: usar la **legacy JWT** (`eyJ...`). Las nuevas `sb_publishable_...` pueden ser
  rechazadas con "Invalid API key" según la config del proyecto. El `service_role` para el motor.
- Realtime UPDATE necesita `replica identity full` en la tabla.

**YouTube Data API**
- 100 unidades por búsqueda; **10.000/día gratis = ~100 búsquedas/día**. Se agota rápido con
  muchas keywords + escaneo frecuente. Manejar 403 `quotaExceeded` y 429 `rateLimitExceeded`
  SIN crashear. El cliente debe **pedir aumento de cuota a Google** (formulario gratis).
- maxResults válido 0–50.

**Spotify Web API**
- Flujo **client-credentials**. La búsqueda EXIGE que la **cuenta dueña de la app tenga Premium**
  (cuentas free → 403 "Active premium subscription required for the owner of the app" en TODOS
  los endpoints). Solución real: cuenta Premium propia + **Extended Quota Mode** (formulario).
- **limit máximo ~10** en apps en modo desarrollo (limit=20+ → 400 "Invalid limit").
- Endpoints `browse/*` (new-releases) dan 403; solo `search` sirve.
- El **Redirect URI** del dashboard ya NO acepta `http://localhost` → usar `http://127.0.0.1:3000`.
- La búsqueda es fuzzy → por eso el filtro de relevancia es necesario.
- Modelo **Bring Your Own Keys**: el producto usa lo que el cliente pega en Ajustes.

**Detección / calidad**
- Ventana "desde HOY" + dedup = se avisa una vez y no se trae catálogo viejo.
- Keywords correctas = **títulos de temas NO lanzados** (no hits ya publicados como "Medellin"
  o "Luna Llena", que traen reposts/covers y ruido).
- Espaciar búsquedas ~400ms para no gatillar rate-limit por ráfaga.

**White-label (color de acento configurable)**
- Definir la paleta `gold` en Tailwind como `rgb(var(--gold-500) / <alpha-value>)` (canales RGB)
  para **preservar los modificadores de opacidad** (`text-gold/40`). Defaults en `:root`.
  Inyectar `--gold-*` desde `settings.accent_color` en el layout del panel y en /login (vía un
  endpoint público `/api/branding`, porque login es pre-auth y RLS bloquea settings).

**TypeScript / build**
- No usar `any` (eslint `no-explicit-any` falla el build) → tipar o castear con interfaces.
- Iterar Set/Map con `Array.from(...)` (si no, error TS2802 por el target).
- **NO correr `npm run build` con el dev server activo** → corrompe `.next` (errores fantasma).
  Si pasa: detener dev, `rm -rf .next`, reiniciar.
- Middleware: cambios en el `matcher` requieren **reiniciar** el server para aplicar.

---

## 13. ENTREGABLES
1. Migraciones SQL (esquema + RLS + realtime + seed + branding + official_channels) en
   `/supabase/migrations`.
2. App Next.js completa: 7 páginas + `/api/scan` + `/api/health` + `/api/branding` + `vercel.json`.
3. `.env.example`, `README.md` (levantar, conectar Supabase, configurar cron, deploy) y un
   `HANDOFF.md` (guía de operación para el cliente).
4. Build de producción verde, sin errores de tipos ni lint.

## 14. CRITERIO DE ACEPTACIÓN
- Agregar artista + keywords + canal oficial desde el panel sin tocar código.
- Dashboard agrega bien los KPI; campanita y badge muestran nuevas en vivo; aviso al terminar
  escaneo (aunque sea 0).
- `/api/scan` busca en YouTube + Spotify, deduplica, filtra ruido/relevancia/oficial, registra
  cuota y **NO falla** si se queda sin cuota o le rechazan una búsqueda.
- Filtraciones y detalle de artista agrupadas por mes; "Ver" abre el link real.
- White-label: cambiar marca/color/textos desde Ajustes aplica al instante (panel + login).
- Nada crashea: APIs caídas, listas vacías y credenciales faltantes se manejan con elegancia.
- Se ve como Leak Sniper (oscuro, dorado, profesional).

## 15. NOTA DE PRODUCCIÓN (para vender enterprise)
El MVP es la herramienta de demo/piloto. Para venta formal a una empresa grande (Sony) faltaría:
auth real multiusuario + roles, DB de producción con backups (Supabase Pro), monitoreo
(Sentry/uptime/audit log), escala del escaneo (worker/cola si hay muchos artistas), y la capa
legal (entidad, contrato, SLA, DPA). Camino: **Deploy → Demo → Piloto pagado → endurecer**.
Ningún SaaS es "sin errores para siempre"; lo enterprise es CONFIABILIDAD (monitoreo + backups
+ soporte + SLA), construida a medida que crece la relación.

Empieza por el esquema de Supabase, luego /api/scan + vercel.json, luego login + dashboard +
notificaciones, luego el resto. Aplica las LECCIONES CRÍTICAS desde el inicio.
