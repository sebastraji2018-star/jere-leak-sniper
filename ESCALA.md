# 📈 Leak Sniper — Plan de escala (caso: cientos de artistas)

El MVP actual escanea **todas las keywords en una sola función serverless** (`/api/scan`,
límite ~60s). Eso funciona para un piloto (decenas de artistas), pero **NO escala** a 500
artistas. Aquí el análisis y la arquitectura para resolverlo.

---

## Los 3 cuellos de botella a escala

Supongamos **500 artistas × ~5 keywords = 2.500 keywords** (cada keyword = 1 búsqueda).

### 1. Tiempo de ejecución (el más urgente)
- 2.500 búsquedas × ~0,5s = **~20+ minutos** en una sola corrida.
- Una función serverless de Vercel muere a los **60s**. → **El escaneo se cortaría.**
- **Solución:** sacar el escaneo de una sola función → **cola + workers** (procesar por lotes
  en paralelo, cada job dentro del límite de tiempo).

### 2. Cuota de YouTube
- Cada búsqueda = **100 unidades**. 2.500 búsquedas = **250.000 unidades por escaneo**.
- Gratis = 10.000/día. → Se necesita **aumento de cuota a Google** (formulario gratis; para
  apps legítimas conceden cientos de miles/millones).
- Si se escanea **1 vez/día**: ~250.000 unidades/día (pedible). Si **cada hora**: ~6M/día
  (mucho). → A escala conviene **1–2 escaneos/día** o priorizar keywords.

### 3. Cuota / rate-limit de Spotify
- 2.500 búsquedas por escaneo, con rate-limits. La app en modo desarrollo topa en **limit=10**
  y se satura rápido.
- **Solución:** The Orchard pide **Extended Quota Mode** (sube límites y rate) + el worker
  espacia/reintenta con backoff.

---

## La arquitectura que escala (Fase 3)

```
  Scheduler (cron)
       │  encola un job por artista (o lote de keywords)
       ▼
  Cola de jobs  ──►  Workers (en paralelo, con rate-limit)
   (Inngest /        cada worker: busca YouTube+Spotify de SUS keywords,
    QStash /         filtra, deduplica, inserta. Reintenta si falla.
    Trigger.dev)
       │
       ▼
  Supabase (Postgres)  ◄─ leaks, scan_runs, etc. (ya indexado)
```

**Cambios concretos:**
1. **Cola de trabajos** (recomendado: **Inngest** o **QStash** — se integran con Vercel/Next):
   el cron deja de "escanear todo" y pasa a **encolar un job por artista**.
2. **Workers idempotentes**: cada job escanea las keywords de UN artista (rápido, dentro del
   límite), con reintentos y backoff ante rate-limits.
3. **Control de cuota global**: un contador de unidades YouTube del día; si se acerca al
   límite, los workers priorizan riesgo alto y posponen el resto (ya existe la lógica base).
4. **Concurrencia limitada**: ej. 5–10 workers en paralelo para no gatillar rate-limits.
5. **Supabase Pro**: más conexiones, backups, y soporta el volumen de filas.

> Esto es **ingeniería real** (no un toggle): ~1–2 semanas de un dev backend. Es el patrón
> estándar de cualquier SaaS que hace scraping/polling a escala.

---

## Recomendación práctica
- **Para el piloto** (decenas de artistas): el MVP actual **funciona tal cual**. No reescribas
  nada todavía.
- **Cuando The Orchard confirme volumen real** (cientos de artistas / contrato firmado):
  se construye la arquitectura de cola. Ahí el costo de la inversión está justificado.
- **Mientras tanto**, dato para la conversación comercial: a 500 artistas necesitarán
  (a) aumento de cuota de YouTube (gratis, formulario), (b) Extended Quota de Spotify (gratis,
  formulario), y (c) el SaaS en plan Vercel Pro + Supabase Pro (~US$45/mes combinados).

---

## Resumen para vender con confianza
> "El producto está listo para operar. Para volúmenes grandes (cientos de artistas) el motor
> se escala con una arquitectura de cola —patrón estándar— que construimos en la fase de
> contrato. Las cuotas de YouTube/Spotify se amplían con los formularios oficiales (gratis),
> dado que es un uso legítimo de protección de catálogo."
