# 🎯 Leak Sniper — Guía de puesta en marcha y operación (The Orchard)

Esta guía explica **todo lo que The Orchard debe hacer** para operar Leak Sniper, desde
cero hasta el uso diario. Dividida en: (1) cuentas, (2) deploy técnico, (3) configuración,
(4) uso diario, (5) mantenimiento.

---

## PARTE 1 — Cuentas necesarias (una sola vez)

| Servicio | Para qué | Costo |
|---|---|---|
| **Supabase** | Base de datos + login del panel | Gratis (plan free alcanza de sobra) |
| **YouTube Data API** (Google Cloud) | Monitoreo de YouTube (el motor principal) | Gratis. Conviene **pedir aumento de cuota** (ver Parte 5) |
| **Vercel** | Hosting del panel + escaneo automático (cron) | Gratis (Hobby) o Pro (~US$20/mes) si se quiere cron horario |
| **Spotify Premium + App** (opcional) | Monitoreo de Spotify | ~US$5/mes (1 sola cuenta, no por usuario) |

> **Importante (Spotify):** la API de Spotify SOLO funciona si la **cuenta dueña de la app
> tiene Premium**. Debe ser una cuenta propia y estable de The Orchard (no prestada).

---

## PARTE 2 — Deploy técnico (una sola vez — lo hace un técnico)

1. **Crear proyecto en Supabase** → ejecutar la migración SQL
   (`supabase/migrations/001_initial.sql` y `002_official_channels.sql`) en el SQL Editor.
2. **Subir el código a Vercel** (importar el repo).
3. **Cargar las variables de entorno** en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET` (un texto secreto largo)
4. **Deploy.** El escaneo automático (cron) queda activo solo por `vercel.json`.
5. **Crear el/los usuario(s) de acceso** en Supabase → Authentication → Add user
   (email + contraseña). Con eso entran al panel.
6. (Opcional) Conectar un **dominio propio** (ej. `leaks.theorchard.com`).

---

## PARTE 3 — Configuración inicial (en el panel, en Ajustes)

1. Entrar al panel y loguearse.
2. Ir a **Ajustes** y pegar las credenciales **propias** de The Orchard:
   - **YouTube API Key** (obligatoria para detectar en YouTube).
   - **Spotify Client ID + Secret** (opcional, solo si usan Spotify con cuenta Premium).
3. Ajustar si quieren:
   - **Intervalo de escaneo** (cada cuántas horas corre el cron).
   - **Límite de cuota diaria** de YouTube.
   - **Nombre del cliente** (white-label).

---

## PARTE 4 — Uso diario (operación) ⭐

Esto es lo que hace el equipo de The Orchard todos los días:

### 4.1 Agregar artistas
- **Artistas → + Agregar artista.** Poner nombre y **nivel de riesgo** (alto/medio/bajo).
  Los de riesgo alto se escanean primero cuando la cuota está justa.

### 4.2 Agregar keywords (¡LO MÁS IMPORTANTE!)
- Entrar al artista → **Keywords**.
- **Regla de oro:** usar como keyword el **título de temas NO lanzados** que se esperan
  filtrar (ej. el nombre de un single inédito, "ponte bonita", etc.).
- ❌ **NO usar hits ya publicados** (ej. "Luna Llena", "Medellin") — traen reposts/covers/edits
  y mucho ruido, no leaks reales.
- Cada keyword cuesta cuota; menos keywords y más específicas = mejor.

### 4.3 Configurar canales oficiales
- En la misma página del artista → **Canales oficiales**.
- Agregar el **canal/artista oficial** (ej. "Jere Klein"). Así sus videos/tracks
  legítimos **NO se marcan como filtración**.

### 4.4 Revisar filtraciones
- La **campanita** avisa cuando entra una filtración nueva (en vivo).
- En **Filtraciones** (separadas por mes) o en cada **artista**, revisar las detecciones.
- Cambiar el **estado** de cada una: `nueva → revisada → takedown enviado → resuelta`.
- Apretar **"Ver"** abre el video/track original para verificar.

### 4.5 Hacer los takedowns (fuera del panel)
- Leak Sniper **detecta y organiza**; el takedown (bajar el contenido) se hace por los
  canales habituales de The Orchard / la plataforma. El panel sirve para llevar el registro
  y el estado de cada caso.

---

## PARTE 5 — Mantenimiento

1. **Cuota de YouTube (importante):** el plan gratis da **10.000 unidades/día = ~100
   búsquedas**. Con muchas keywords + escaneo frecuente se agota. Soluciones:
   - **Pedir aumento de cuota a Google** (gratis, formulario "YouTube API Services - Audit
     and Quota Extension Form" para apps legítimas).
   - O reducir frecuencia de escaneo / cantidad de keywords.
   - El sistema **nunca se cae** si se agota la cuota: prioriza riesgo alto y termina limpio.
2. **Spotify:** mantener la cuenta Premium activa. Si se cancela, Spotify se bloquea
   (el resto del panel sigue funcionando con YouTube).
3. **Afinar keywords y canales oficiales** según lo que aparezca, para reducir ruido.

---

## Qué garantiza el producto (expectativas honestas)

- ✅ **YouTube:** monitoreo sólido, gratis y abierto. Es el motor principal — donde
  realmente aparecen las filtraciones.
- ⚠️ **Spotify:** funciona como complemento, **siempre que haya una cuenta Premium propia
  y estable**. Spotify es distribución cerrada, así que los leaks pre-lanzamiento son raros
  ahí; lo que sí caza son **subidas no oficiales bajo nombres falsos**.
- 🛡️ **Robustez:** el panel no se cae si una API falla o se agota la cuota; muestra estados
  informativos y sigue operando.

---

## Resumen ultra-corto (checklist de entrega)

- [ ] Cuenta Supabase + migración SQL aplicada
- [ ] Deploy en Vercel + variables de entorno + `CRON_SECRET`
- [ ] Usuario(s) de acceso creados
- [ ] YouTube API Key propia pegada en Ajustes (+ aumento de cuota pedido a Google)
- [ ] (Opcional) Spotify: cuenta Premium propia + Client ID/Secret en Ajustes
- [ ] Artistas cargados con su nivel de riesgo
- [ ] Keywords = títulos de temas NO lanzados (no hits ya publicados)
- [ ] Canales oficiales configurados por artista
- [ ] Equipo entrenado en el flujo: revisar → cambiar estado → takedown
