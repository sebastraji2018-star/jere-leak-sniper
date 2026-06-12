# 📄 Leak Sniper — Contexto completo del proyecto

> Resumen para entender qué es, qué construimos, qué tecnologías usamos, qué falta, y
> qué tiene que hacer el cliente (The Orchard). Pensado para compartir.

---

## 1. ¿Qué es?
**Leak Sniper** es un SaaS (software web con login) que **detecta filtraciones de música no
lanzada**. Monitorea **YouTube y Spotify** buscando, por palabras clave, subidas no oficiales
de los temas de un artista, y las muestra en un panel — todo dentro de la misma plataforma,
sin herramientas externas.

Es **white-label** (la marca se personaliza por cliente). El cliente objetivo es **The Orchard**
(distribuidora de Sony Music), para proteger el catálogo de sus artistas.

---

## 2. ¿Qué construimos? (ya funciona)
- 🔐 **Login** y panel protegido.
- 🎤 **Gestión de artistas** (agregar/editar/pausar/borrar, con nivel de riesgo).
- 🔑 **Keywords por artista** (lo que el motor busca), con costo de cuota visible.
- 🛰️ **Motor de escaneo** (`/api/scan`): busca en YouTube + Spotify, deduplica, controla cuota,
  y filtra **ruido** (reacciones, type beats, lyric videos, lives, edits, noticias) y
  **falsos positivos** (relevancia + canales oficiales).
- 🔔 **Notificaciones in-panel** (campanita en vivo, toasts, refrescar/limpiar).
- 📊 **Dashboard** con KPIs, cuota, próximo escaneo, botón "Escanear ahora".
- 📋 **Filtraciones agrupadas por mes** (últimos 6 meses), filtrables y con estado editable.
- 🎨 **White-label** configurable desde Ajustes (marca, color, textos, cliente).
- ⚙️ **Ajustes** donde el cliente pega **sus propias credenciales** de API.

**Probado con datos reales:** detectó filtraciones reales tanto en YouTube (un video de prueba)
como en Spotify (una subida no oficial de un tema).

---

## 3. Tecnologías y servicios que USAMOS
| Pieza | Tecnología |
|---|---|
| Frontend + backend | **Next.js 14** (React) + **TypeScript** + **Tailwind CSS** |
| Base de datos + Login + tiempo real | **Supabase** (Postgres + Auth + Realtime) |
| Hosting + escaneo automático (cron) | **Vercel** |
| Monitoreo YouTube | **YouTube Data API v3** |
| Monitoreo Spotify | **Spotify Web API** |
| Código | **GitHub** (repo `sebastraji2018-star/jere-leak-sniper`) |

> Modelo "**Bring Your Own Keys**": el producto es el motor; **el cliente conecta sus propias
> credenciales** de YouTube y Spotify en Ajustes. Probado: pegar las claves en el panel guarda
> y conecta sin errores.

---

## 4. Estado actual
- ✅ Producto funcional y probado en local.
- ✅ Código en GitHub.
- ⏳ **Falta el deploy a Vercel** (subirlo a la nube con una URL pública).
- ⏳ Falta endurecerlo para "enterprise" (ver sección 6).

---

## 5. Lo que tiene que hacer THE ORCHARD (importante: la cuota)
El producto funciona con **las credenciales del cliente**. The Orchard debe:

### YouTube (el motor principal — gratis)
1. Crear un proyecto en **Google Cloud Console** y generar una **YouTube Data API Key**.
2. La cuota gratis es **10.000 unidades/día = ~100 búsquedas/día**. Con muchas keywords se agota.
   → **Solicitar aumento de cuota** llenando el formulario oficial y gratis:
   **"YouTube API Services - Audit and Quota Extension Form"**. Para un caso legítimo
   (protección de catálogo de Sony) lo aprueban.
3. Pegar la API Key en **Ajustes** del panel.

### Spotify (complemento — requiere acceso)
1. Crear una **app propia** en developer.spotify.com **bajo la cuenta de la empresa**.
2. La API de Spotify exige que la cuenta dueña de la app tenga **Premium** y, para límites
   reales, **"Extended Quota Mode"** (formulario oficial y gratis que Spotify revisa).
   → The Orchard, como **socio de Spotify (Sony)**, está en posición de conseguir este acceso
   (incluso por su contacto de partner). Ahí describen su volumen (artistas, keywords,
   frecuencia) y Spotify asigna la cuota.
3. Pegar el **Client ID + Secret** en **Ajustes**.

> ⚠️ Honesto: Spotify es plataforma cerrada — las filtraciones pre-lanzamiento aparecen sobre
> todo en **YouTube**. Spotify es un complemento que detecta **subidas no oficiales bajo nombres
> falsos**, siempre que la cuenta tenga el acceso adecuado.

### Operación diaria
- Cargar sus artistas + keywords (**títulos de temas NO lanzados**, no hits ya publicados).
- Configurar el **canal oficial** de cada artista (para excluir lo legítimo).
- Revisar filtraciones, cambiar estado (nueva → revisada → takedown → resuelta), y hacer el
  takedown por sus canales.

---

## 6. Lo que falta para "enterprise" (cuando avancen con Sony)
Esto NO es necesario para una demo/piloto, sí para un contrato formal:
- **Auth real**: usuarios por persona + roles (hoy hay un login simple).
- **Base de datos de producción**: Supabase Pro (backups) + rotar las llaves de prueba.
- **Monitoreo**: Sentry (errores) + uptime + audit log.
- **Seguridad**: pasar el cuestionario de proveedor de Sony, cifrado, DPA.
- **Legal**: entidad para facturar (SpA) + contrato + SLA + DPA (con abogado).
- **Escala**: mover el escaneo a un worker si hay muchos artistas.

---

## 7. El camino recomendado
**Deploy (demo en vivo) → mostrarlo → piloto pagado → si dicen que sí → invertir en lo enterprise.**

No hace falta tenerlo "perfecto para siempre" antes de vender: ningún SaaS lo está. Lo enterprise
es **confiabilidad** (monitoreo + backups + soporte + SLA), no "cero errores", y se construye a
medida que crece la relación con el cliente.

---

## 8. Accesos
- **Repo:** GitHub `sebastraji2018-star/jere-leak-sniper`
- **Demo (local/deploy):** login con usuario **orchard** / contraseña **orchard**
  (cambiar por una fuerte antes de entregar).
- **Credenciales de API:** se pegan en Ajustes (no van en el código).
