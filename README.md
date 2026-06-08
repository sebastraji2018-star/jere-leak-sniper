# 🎯 Leak Sniper — The Orchard

Plataforma SaaS white-label para **detectar filtraciones de música no lanzada**. Monitorea
YouTube por palabras clave, deduplica resultados y avisa **dentro del propio panel** (sin
herramientas externas, sin Telegram, sin email).

Construido para **The Orchard** (distribuidora de Sony Music).

---

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres + Auth + Realtime
- **Vercel** — hosting + Cron para el motor de escaneo (`/api/scan`)

Identidad visual: fondo casi negro, acentos dorado/ámbar (`#F5B500`), tipografía
**Bricolage Grotesque** (títulos) + **IBM Plex Mono** (números).

---

## Funcionalidades

- 🔐 Login con Supabase Auth (todas las rutas protegidas).
- 🎤 CRUD de **artistas** (agregar, editar, pausar, borrar; nivel de riesgo).
- 🔑 CRUD de **keywords** por artista en tiempo real, con costo de cuota visible.
- 🛰️ **Motor de escaneo** (`/api/scan`): YouTube Data API, dedup por `external_id`,
  control de cuota (nunca falla por quedarse sin cuota; prioriza riesgo alto).
- 🔔 **Notificaciones in-panel**: campanita con contador, badge en el menú, toasts en vivo
  vía Supabase Realtime.
- 📊 **Dashboard**: KPIs agregados, barra de cuota YouTube, countdown al próximo scan,
  botón "Escanear ahora".
- 📋 **Filtraciones**: tabla filtrable (artista/plataforma/estado) y ordenable (vistas/fecha).
- ⚙️ **Ajustes**: el cliente pega sus propias credenciales de API (se guardan en `settings`).
- 🛡️ **Robustez**: cada llamada externa va en try/catch; APIs caídas, listas vacías y
  credenciales faltantes se manejan con estados elegantes. El panel nunca crashea.

---

## 1. Levantar local

```bash
npm install
cp .env.example .env.local   # y rellena los valores (ver abajo)
npm run dev                  # http://localhost:3000
```

## 2. Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **Aplica el esquema**: copia el contenido de
   [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) y pégalo en
   el **SQL Editor** del dashboard de Supabase → *Run*. Esto crea las tablas, las políticas
   RLS, habilita Realtime sobre `leaks` y siembra un artista de ejemplo (Jere Klein) + 8 keywords.
   *(Con la CLI: `supabase db push`.)*
3. En **Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
4. **Crea un usuario** en *Authentication → Users → Add user* (con email confirmado) para
   poder entrar al panel.
5. Entra a `/ajustes` dentro del panel y pega tu **YouTube API Key** (y Spotify si aplica).

### Variables de entorno (`.env.local`)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / publishable key (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (servidor; ignora RLS) |
| `CRON_SECRET` | Secreto para autorizar `/api/scan` desde Vercel Cron |

> Las credenciales de YouTube/Spotify **no** van en el `.env`: el cliente las pega en `/ajustes`.

## 3. Configurar el Cron en Vercel

El archivo [`vercel.json`](vercel.json) ya define el cron:

```json
{ "crons": [{ "path": "/api/scan", "schedule": "0 */2 * * *" }] }
```

- Corre cada 2 horas. Para cambiar la frecuencia, edita el `schedule` (sintaxis cron).
  *(Nota: el plan Hobby de Vercel limita los crons a 1 vez/día; usa Pro para mayor frecuencia.)*
- Define `CRON_SECRET` en Vercel (*Settings → Environment Variables*). Vercel enviará
  automáticamente `Authorization: Bearer <CRON_SECRET>`, que `/api/scan` valida.
- El botón **"Escanear ahora"** del panel llama a `/api/scan` autenticado como usuario
  (`triggered_by=manual`).

## 4. Deploy

```bash
# Conecta el repo a Vercel (o usa la CLI)
vercel
```

1. Importa el proyecto en Vercel.
2. Agrega las 4 variables de entorno.
3. Deploy. El cron queda activo automáticamente por `vercel.json`.
4. Agrega tu dominio custom en *Settings → Domains* (SSL automático).
5. Health check: `GET /api/health`.

---

## Esquema de datos

`artists` · `keywords` · `leaks` · `scan_runs` · `settings` (fila singleton).
Ver [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

RLS: solo usuarios **autenticados** leen/escriben. El motor de escaneo usa la
`service_role` key (ignora RLS) y solo corre en el servidor.

## Cómo funciona el motor (`/api/scan`)

1. Lee `settings` + artistas activos (ordenados por riesgo) + keywords activas.
2. Por cada keyword: `search.list` de YouTube (`type=video`, `order=date`,
   `publishedAfter=último scan`). Cada búsqueda cuesta 100 unidades.
3. **Antes** de cada búsqueda chequea no pasar `daily_quota_limit`; si está cerca, ya cubrió
   primero los artistas de riesgo alto y termina limpio (nunca falla por cuota).
4. Deduplica por `external_id`; inserta solo lo nuevo con estado `nueva`.
5. Registra cada corrida en `scan_runs` (unidades, leaks, trigger, estado, error).
6. La inserción de un leak `nueva` dispara la notificación in-panel vía Realtime.
