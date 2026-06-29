# Mate con Mafer

Aplicación web privada para que Mafer practique matemáticas de forma sencilla, bonita e instalable en iPad, iPhone, Android y computador.

Esta primera versión incluye:

- Inicio de Mafer con estrellas, racha y botones grandes.
- Práctica de sumas, restas, multiplicaciones y divisiones.
- Login por correo y contraseña con Supabase Auth.
- Un ejercicio por pantalla con respuesta, revisión y pista amable.
- Tutor de matemáticas conectado a OpenAI desde una ruta segura de servidor.
- Botones rápidos para pedir pista, otra explicación, otro ejemplo o un reto.
- Progreso con estrellas, respuestas correctas, temas practicados y racha.
- Panel de papá con progreso, errores por tema, ejercicios realizados y retos de 5 o 10 preguntas.
- PWA instalable desde Safari en iPad.
- Supabase preparado para usuarios, progreso, intentos, retos y conversaciones educativas del tutor.
- Sin pagos, sin App Store y sin anuncios.

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
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=gpt-4o-mini
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase
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

Si quieres dejar los perfiles listos sin esperar al primer login, ejecuta despues [supabase-onboarding.sql](/Users/dbotero/Documents/mate-con-mafer/supabase-onboarding.sql). Ese archivo no crea contraseñas; solo crea/actualiza los perfiles usando los usuarios que ya existen en Supabase Auth.

Para que el panel de papá vea los datos de Mafer, debe existir una fila en `assignments` con:

- `parent_id`: id del perfil del papá.
- `child_id`: id del perfil de Mafer.

Puedes crear la primera relación desde el panel de papá pegando el id de Mafer, o directamente desde Supabase.

Si el papá no puede crear un reto, casi siempre falta una de estas cosas:

- Mafer no existe todavía en `Authentication > Users`.
- Mafer existe en Auth, pero todavía no existe su fila en `profiles` con rol `child`.
- El papá existe en Auth, pero no existe su fila en `profiles` con rol `parent`.
- El id pegado en el panel no es el id de Mafer.

La tabla `tutor_messages` guarda solo conversación educativa y tema trabajado. No guarda fotos, correos, nombres ni información personal extra.

## Alta de papá e hija

La app permite crear una cuenta de papá desde la pantalla de entrada. Después, desde el panel de papá, se puede dar de alta a la hija con nombre, correo, grado y una contraseña temporal.

Para que papá pueda crear la cuenta de la hija desde la app, agrega esta variable solo en el servidor/local/Vercel:

```bash
SUPABASE_SERVICE_ROLE_KEY
```

En Supabase está en `Project Settings > API > service_role key`. Es una clave privada: no debe comenzar con `NEXT_PUBLIC_` y no debe subirse a GitHub.

## Tutor con OpenAI

El tutor usa la ruta interna `/api/tutor`, así que `OPENAI_API_KEY` nunca llega al navegador.

En local y en Vercel agrega:

```bash
OPENAI_API_KEY
OPENAI_MODEL
```

`OPENAI_MODEL` es opcional. Si lo dejas vacío, la app usa `gpt-4o-mini`.

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
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_MODEL
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
- La clave de OpenAI solo vive en el servidor.
- La clave `SUPABASE_SERVICE_ROLE_KEY` solo vive en el servidor y se usa para crear la cuenta de la hija.
- Las fotos de tareas se envían al tutor para orientar el procedimiento, pero no se guardan en Supabase.
