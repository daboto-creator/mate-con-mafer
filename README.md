# Mate con Mafer

Aplicación web privada para que Mafer practique matemáticas de forma sencilla, bonita e instalable en iPad, iPhone, Android y computador.

Esta primera versión incluye:

- Inicio de Mafer con estrellas, racha y botones grandes.
- Práctica de sumas, restas, multiplicaciones y divisiones.
- Login por correo y contraseña con Supabase Auth.
- Un ejercicio por pantalla con respuesta, revisión y pista amable.
- Tutor de matemáticas vacío por ahora, con botón para subir foto de tarea.
- Progreso con estrellas, respuestas correctas, temas practicados y racha.
- Panel de papá con progreso, errores por tema, ejercicios realizados y retos de 5 o 10 preguntas.
- PWA instalable desde Safari en iPad.
- Supabase preparado para usuarios, progreso, intentos y retos.
- Sin OpenAI API, sin pagos, sin App Store y sin anuncios.

## Tecnología

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Preparada para Vercel

## Empezar

1. Instala dependencias:

```bash
pnpm install
```

2. Crea el archivo `.env.local` usando `.env.local.example` como base:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_publishable_key
```

3. Ejecuta la app:

```bash
pnpm dev
```

4. Abre:

```text
http://localhost:3000
```

## Supabase

1. En Supabase, deja activo `Authentication > Sign In / Providers > Email`.
2. Ejecuta el archivo [supabase-schema.sql](/Users/dbotero/Documents/mate-con-mafer/supabase-schema.sql) en el SQL Editor.
3. Crea estas cuentas en `Authentication > Users` con contraseñas de prueba que tú elijas:

```text
parent@example.com
mafer@example.com
```

No pongas contraseñas reales ni contraseñas dentro del código.

La app crea automáticamente los perfiles en la tabla `profiles` la primera vez que esas cuentas inician sesión:

- `parent@example.com` queda con rol `parent`.
- `mafer@example.com` queda con rol `child`.

Para que el panel de papá vea los datos de Mafer, debe existir una fila en `assignments` con:

- `parent_id`: id del perfil del papá.
- `child_id`: id del perfil de Mafer.

Puedes crear la primera relación desde el panel de papá pegando el id de Mafer, o directamente desde Supabase.

## Instalar en iPad

1. Despliega la app en Vercel.
2. Abre la URL en Safari del iPad.
3. Toca el boton de compartir.
4. Elige `Agregar a pantalla de inicio`.
5. Abre `Mate Mafer` desde el icono.

## Desplegar en Vercel

1. Sube este proyecto a GitHub.
2. En Vercel, crea un proyecto nuevo e importa el repositorio.
3. Agrega estas variables en `Settings > Environment Variables`:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Despliega.

## Personalización

- La foto de Mafer se puede subir desde el encabezado de la app. En esta versión se guarda en el dispositivo.
- La imagen principal está en `public/images/mate-con-mafer-hero.png`.

## Notas de privacidad

- No se pide información personal.
- No hay chat entre usuarios.
- No hay pagos.
- No hay anuncios.
- No se conecta OpenAI API.
