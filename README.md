# 📌 Corcho — muros colaborativos para todos tus cursos

Un "Padlet" propio: muchos muros agrupados por curso, compartibles por enlace o QR, que se replican en otros cursos con un clic. Corre gratis en Netlify (Functions + Blobs), **sin base de datos externa ni cuentas para estudiantes**.

## Qué trae

**Cursos y réplica**
- Cursos con ícono y color; cada uno agrupa sus muros.
- **Replicar un muro** en varios cursos a la vez (con o sin publicaciones).
- **Replicar un curso entero** (todos sus muros) en cursos nuevos: "4° B", "4° C"…
- Duplicar y mover muros entre cursos.
- Página pública por curso (`#/c/…`) con todos sus muros visibles.

**7 formatos de muro:** Muro (ladrillos), Grilla, Flujo, Columnas (secciones con arrastrar y soltar), Lienzo libre (arrastrar, zoom, doble clic para crear), Línea de tiempo (por fecha) y Mapa (Leaflet + búsqueda de lugares).

**Publicaciones:** texto con **negrita**/*cursiva*, imágenes (se comprimen automáticamente, también por pegado o cámara del celular), enlaces con vista previa, videos embebidos (YouTube, Vimeo, Spotify, Google Docs/Slides/Forms/Drive, Canva, Genially, Wordwall), **grabación de audio**, **dibujo a mano alzada**, archivos/PDF y **encuestas**. 10 colores de tarjeta.

**Interacción:** reacciones configurables (me gusta, votar 👍👎, estrellas, emojis, nota del docente), comentarios, fijar publicaciones, calificar.

**Control docente:** moderación (aprobar o rechazar), muro bloqueado de solo lectura, anónimos sí/no, ocultar autores, permitir que todos muevan tarjetas, visibilidad en la página del curso, vaciar muro.

**Diseño:** 16 fondos (corcho, pizarrón, cuaderno, cuadriculado, plano, aurora…) o una imagen propia, 4 estilos de tarjeta (limpio, post-it, vidrio, cómic), 5 tipografías y modo claro u oscuro.

**Extras:** actualización en vivo (cada 3 s), modo presentación (pantalla completa, auto y aleatorio), QR descargable y "QR gigante" para el proyector, compartir por WhatsApp, exportar a CSV (Excel), imprimir o guardar en PDF, buscar y ordenar, 12 plantillas (lluvia de ideas, KWL, ticket de salida, debate, galería, mapa mental, retro, preguntas anónimas…), atajo `N` para publicar y confeti 🎉.

## Publicar en Netlify

> ⚠️ El "arrastrar y soltar la carpeta" de Netlify **no** instala la función del servidor. Así la app abre en *modo demo local*: funciona, pero los datos quedan en un solo navegador. Para compartir de verdad, usá una de estas dos opciones.

### Opción A — GitHub (recomendada)
1. Subí esta carpeta a un repositorio nuevo de GitHub.
2. En Netlify: **Add new site → Import an existing project →** elegí el repo.
3. Netlify lee `netlify.toml` solo (publish `public`, funciones `netlify/functions`). Tocá **Deploy**.
4. Entrá a tu sitio, elegí tu **contraseña de docente** (la primera que escribas queda registrada) y listo.

### Opción B — Netlify CLI
```bash
npm install
npx netlify-cli login
npx netlify-cli deploy --prod
```

No hace falta configurar variables de entorno ni base de datos: Netlify Blobs se activa solo.

## Cómo se usa
1. Creá un curso → **＋ Nuevo muro** → elegí una plantilla.
2. Tocá **Compartir**: copiá el enlace o mostrá el QR. Los estudiantes entran sin cuenta.
3. Para otra división: menú del muro **⋯ → Replicar en otros cursos**, o **🧬 Replicar curso** para copiar todo.

## Probar en tu compu
```bash
node dev/server.mjs     # http://localhost:8888 (API real con almacenamiento en memoria)
# o: npx netlify-cli dev  (entorno idéntico a Netlify)
```

## Estructura
```
public/              Frontend estático (HTML + CSS + JS sin compilación)
  js/core.js         Lógica compartida (reglas, plantillas, operaciones)
  js/api.js          Cliente: Netlify o modo demo local automático
  js/app.js          Interfaz
netlify/functions/api.mjs   API + almacenamiento (Netlify Blobs, escrituras atómicas)
dev/                 Servidor de prueba local
```

## Notas
- Archivos de hasta 5 MB por publicación (las imágenes se achican antes de subirse).
- Hasta 800 publicaciones por muro.
- Para cambiar la contraseña docente: en Netlify → **Blobs → corcho-data**, borrá la clave `config` y entrá con la nueva.
- Quien tiene el enlace de un muro puede publicar (salvo que esté bloqueado). Usá la moderación en muros abiertos al público.
